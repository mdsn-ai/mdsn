export type WebRuntimeLocale = "en" | "zh";

export type WebRuntimeMessages = {
  chooseOption: string;
  inputSectionTitle: string;
  readSectionTitle: string;
  writeSectionTitle: string;
  sourceLabel: string;
  viewRawMarkdownLink: string;
  pageReadyStatus: string;
  emptyBlock: string;
  emptyList: string;
  emptyImage: string;
  imageAltFallback: string;
  listItemFallback: string;
  missingInput: string;
  fillRequired: string;
  operationRunning: string;
  operationFailed: string;
  operationSuccess: string;
  networkError: string;
  dependencyChainInterrupted: string;
  blockErrorState: string;
  dependencyNotReady: string;
  unknownError: string;
};

export const WEB_RUNTIME_MESSAGES: Record<WebRuntimeLocale, WebRuntimeMessages> = {
  en: {
    chooseOption: "Please choose",
    inputSectionTitle: "Input",
    readSectionTitle: "Read",
    writeSectionTitle: "Write",
    sourceLabel: "Source",
    viewRawMarkdownLink: "View raw Markdown",
    pageReadyStatus: "Page loaded. Ready for action.",
    emptyBlock: "No content yet.",
    emptyList: "No entries yet.",
    emptyImage: "No image yet.",
    imageAltFallback: "image",
    listItemFallback: "item",
    missingInput: "Missing input: ",
    fillRequired: "Please fill: ",
    operationRunning: "Running: ",
    operationFailed: "Failed: ",
    operationSuccess: "Succeeded: ",
    networkError: "Network error: ",
    dependencyChainInterrupted: "Execution failed, dependency chain interrupted.",
    blockErrorState: "This block is in an error state.",
    dependencyNotReady: "Dependencies not ready: ",
    unknownError: "UNKNOWN_ERROR",
  },
  zh: {
    chooseOption: "请选择",
    inputSectionTitle: "输入",
    readSectionTitle: "读取",
    writeSectionTitle: "写入",
    sourceLabel: "源文件",
    viewRawMarkdownLink: "查看原始 Markdown",
    pageReadyStatus: "页面已加载，等待操作。",
    emptyBlock: "暂无内容。",
    emptyList: "还没有内容。",
    emptyImage: "暂无图片。",
    imageAltFallback: "image",
    listItemFallback: "item",
    missingInput: "缺少输入：",
    fillRequired: "请先填写：",
    operationRunning: "执行中：",
    operationFailed: "执行失败：",
    operationSuccess: "执行成功：",
    networkError: "网络错误：",
    dependencyChainInterrupted: "执行失败，依赖链已中断。",
    blockErrorState: "当前 block 已进入错误状态。",
    dependencyNotReady: "依赖未就绪：",
    unknownError: "UNKNOWN_ERROR",
  },
};

export const DEFAULT_WEB_RUNTIME_LOCALE: WebRuntimeLocale = "en";

export function resolveWebRuntimeLocale(input?: string | null): WebRuntimeLocale {
  if (typeof input !== "string") return DEFAULT_WEB_RUNTIME_LOCALE;
  const normalized = input.trim().toLowerCase();
  return normalized.startsWith("zh") ? "zh" : "en";
}

export function getWebRuntimeMessages(input?: string | null): WebRuntimeMessages {
  return WEB_RUNTIME_MESSAGES[resolveWebRuntimeLocale(input)];
}
