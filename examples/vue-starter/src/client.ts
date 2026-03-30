import { createHeadlessHost, type HeadlessSnapshot } from "@mdsnai/sdk/web";
import { marked } from "marked";
import { createApp, computed, defineComponent, onBeforeUnmount, onMounted, reactive, ref } from "vue";

function humanizeLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function renderMarkdown(markdown: string): string {
  return marked.parse(markdown) as string;
}

const VueMdsnHeadlessHost = defineComponent({
  name: "VueMdsnHost",
  setup() {
    const status = ref("idle");
    const error = ref("");
    const snapshot = ref<HeadlessSnapshot | null>(null);
    const values = reactive<Record<string, string>>({});
    const submitting = ref<Record<string, boolean>>({});
    const pageHtml = computed(() => renderMarkdown(snapshot.value?.markdown ?? ""));
    let host = createHeadlessHost({
      root: document,
      fetchImpl: window.fetch.bind(window)
    });
    let unsubscribe: (() => void) | null = null;

    onMounted(() => {
      unsubscribe = host.subscribe((next) => {
        snapshot.value = next;
        status.value = next.status;
        error.value = next.error ?? "";
      });
      host.mount();
    });

    onBeforeUnmount(() => {
      unsubscribe?.();
      host.unmount();
    });

    async function runGet(operation: HeadlessSnapshot["blocks"][number]["operations"][number]) {
      await host.submit(operation, {});
    }

    async function runPost(
      operation: HeadlessSnapshot["blocks"][number]["operations"][number],
      form: HTMLFormElement
    ) {
      if (!form.reportValidity()) {
        return;
      }
      submitting.value = {
        ...submitting.value,
        [operation.target]: true
      };
      const payload: Record<string, string> = {};
      for (const name of operation.inputs) {
        payload[name] = values[name] ?? "";
      }
      await host.submit(operation, payload);
      for (const name of operation.inputs) {
        values[name] = "";
      }
      submitting.value = {
        ...submitting.value,
        [operation.target]: false
      };
    }

    return {
      error,
      humanizeLabel,
      pageHtml,
      renderMarkdown,
      runGet,
      runPost,
      snapshot,
      status,
      submitting,
      values
    };
  },
  template: `
    <div class="framework-shell">
      <div class="framework-status">
        <span class="framework-pill">Vue headless host: {{ status }}</span>
        <span v-if="error" class="framework-error">{{ error }}</span>
      </div>

      <main v-if="snapshot" class="framework-page">
        <div v-html="pageHtml"></div>

        <section v-for="block in snapshot.blocks" :key="block.name" class="framework-block">
          <div class="framework-block-copy" v-html="renderMarkdown(block.markdown)"></div>

          <div
            v-if="block.operations.some((operation) => operation.method === 'GET')"
            class="framework-actions"
          >
            <button
              v-for="operation in block.operations.filter((operation) => operation.method === 'GET')"
              :key="operation.target"
              class="framework-button framework-button-secondary"
              type="button"
              @click="runGet(operation)"
            >
              {{ operation.label ?? operation.name ?? operation.target }}
            </button>
          </div>

          <form
            v-for="operation in block.operations.filter((operation) => operation.method === 'POST')"
            :key="operation.target"
            class="framework-form"
            @submit.prevent="runPost(operation, $event.currentTarget)"
          >
            <label
              v-for="input in block.inputs.filter((input) => operation.inputs.includes(input.name))"
              :key="input.name"
              class="framework-field"
            >
              <span class="framework-label">
                {{ humanizeLabel(input.name) }}
                <span v-if="input.required" class="framework-required">*</span>
              </span>
              <input
                v-if="input.type !== 'choice' && input.type !== 'boolean' && input.type !== 'asset'"
                v-model="values[input.name]"
                :name="input.name"
                :type="input.secret ? 'password' : input.type === 'number' ? 'number' : 'text'"
                :required="input.required"
                :placeholder="input.name === 'message' ? 'Write something worth keeping' : ''"
              >
              <select
                v-else-if="input.type === 'choice'"
                v-model="values[input.name]"
                :name="input.name"
                :required="input.required"
              >
                <option v-for="option in input.options ?? []" :key="option" :value="option">{{ option }}</option>
              </select>
              <input
                v-else-if="input.type === 'boolean'"
                v-model="values[input.name]"
                :name="input.name"
                type="checkbox"
                :required="input.required"
                true-value="true"
                false-value="false"
              >
              <input
                v-else
                :name="input.name"
                type="file"
                :required="input.required"
                @change="values[input.name] = $event.target.files?.[0]?.name ?? ''"
              >
            </label>
            <button
              class="framework-button"
              type="submit"
              :disabled="snapshot.status === 'loading' || submitting[operation.target]"
            >
              {{ operation.label ?? operation.name ?? operation.target }}
            </button>
          </form>
        </section>
      </main>
    </div>
  `
});

export function mountVueStarter(host: HTMLElement): void {
  createApp(VueMdsnHeadlessHost).mount(host);
}
