declare module "invoice:pdf-worker" {
  const source: string;
  export default source;
}

declare module "invoice:core-worker" {
  const source: string;
  export default source;
}

declare module "invoice:pdf-fonts" {
  const fonts: Record<string, string>;
  export default fonts;
}

declare module "invoice:licenses" {
  const text: string;
  export default text;
}