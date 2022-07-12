declare module "postcss-import-sync2" {
  import { PluginCreator } from "postcss";
  const pluginCreator: PluginCreator<any>;
  export default pluginCreator;
}

declare module "*/node_modules/css-declaration-sorter/orders/alphabetical.mjs" {
  export const properties: string[];
}
