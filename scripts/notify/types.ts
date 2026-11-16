export type Alert = {
  title: string;
  lines: string[];
  footer?: string;
  /** When the data was current. Each receiver shows it in its own way. */
  time?: Date;
};

export type Notifier = {
  name: string;
  send: (alert: Alert) => Promise<void>;
};
