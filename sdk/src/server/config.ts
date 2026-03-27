export type MdsnConfig = {
  site?: {
    title?: string;
    description?: string;
    baseUrl?: string;
  };
  server?: {
    port?: number;
  };
  dirs?: {
    pages?: string;
    server?: string;
    public?: string;
    layouts?: string;
  };
  markdown?: {
    linkify?: boolean;
    typographer?: boolean;
  };
  dev?: {
    openBrowser?: boolean;
  };
  i18n?: {
    defaultLocale?: string;
    locales?: string[];
  };
};

export type ResolvedMdsnConfig = {
  site: {
    title?: string;
    description?: string;
    baseUrl?: string;
  };
  server: {
    port: number;
  };
  dirs: {
    pages: string;
    server: string;
    public: string;
    layouts: string;
  };
  markdown: {
    linkify: boolean;
    typographer: boolean;
  };
  dev: {
    openBrowser: boolean;
  };
  i18n: {
    defaultLocale: string;
    locales: string[];
  };
};

export function defineConfig(config: MdsnConfig): MdsnConfig {
  return config;
}

export function resolveConfig(config: MdsnConfig): ResolvedMdsnConfig {
  const locales = (config.i18n?.locales ?? ["en"]).filter((item) => item.trim().length > 0);
  const defaultLocale = config.i18n?.defaultLocale ?? locales[0] ?? "en";
  const normalizedLocales = locales.length > 0 ? locales : [defaultLocale];
  if (!normalizedLocales.includes(defaultLocale)) {
    normalizedLocales.unshift(defaultLocale);
  }

  return {
    site: {
      title: config.site?.title,
      description: config.site?.description,
      baseUrl: config.site?.baseUrl,
    },
    server: {
      port: config.server?.port ?? 3000,
    },
    dirs: {
      pages: config.dirs?.pages ?? "pages",
      server: config.dirs?.server ?? "server",
      public: config.dirs?.public ?? "public",
      layouts: config.dirs?.layouts ?? "layouts",
    },
    markdown: {
      linkify: config.markdown?.linkify ?? true,
      typographer: config.markdown?.typographer ?? false,
    },
    dev: {
      openBrowser: config.dev?.openBrowser ?? true,
    },
    i18n: {
      defaultLocale,
      locales: normalizedLocales,
    },
  };
}
