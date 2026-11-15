export type Alert = {
  title: string;
  lines: string[];
  footer?: string;
};

export type Notifier = {
  name: string;
  send: (alert: Alert) => Promise<void>;
};
