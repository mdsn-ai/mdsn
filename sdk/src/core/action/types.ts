export type ActionFieldErrors = Record<string, string>;

export type FragmentActionSuccess = {
  ok: true;
  kind: "fragment";
  markdown: string;
};

export type ActionFailure = {
  ok: false;
  errorCode: string;
  message?: string;
  fieldErrors?: ActionFieldErrors;
};

export type ActionSuccess = FragmentActionSuccess;
export type ActionResult = ActionSuccess | ActionFailure;
