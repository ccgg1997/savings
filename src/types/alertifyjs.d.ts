declare module "alertifyjs" {
  interface Alertify {
    set(namespace: string, key: string, value: unknown): void;
    notify(message: string, type?: string, wait?: number): void;
    error(message: string, wait?: number): void;
    success(message: string, wait?: number): void;
    message(message: string, wait?: number): void;
  }

  const alertify: Alertify;
  export default alertify;
}

