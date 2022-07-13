import { join } from "path";
import { PluginObj, types as t } from "@babel/core";
import cssnano from "cssnano";
import advanced from "cssnano-preset-advanced";
import { transformSync } from "esbuild";
import { Options, minify } from "html-minifier";
import postcss from "postcss";
import postcssImport from "postcss-import-sync2";
import nested from "postcss-nested";
import { properties } from "../node_modules/css-declaration-sorter/orders/alphabetical.mjs";

const _filename = join(process.cwd(), "index.js");

export default (_: any, options: Options): PluginObj => {
  const transformCss = (path: string, css: string) =>
    postcss([
      postcssImport(),
      nested(),
      cssnano({
        preset: [
          advanced,
          { cssDeclarationSorter: { order: (a: string, b: string) => properties.indexOf(a) - properties.indexOf(b) } },
        ],
      }),
    ]).process(css, { from: path }).css;

  const transformHtml = (path: string, html: string) =>
    minify(html, {
      collapseBooleanAttributes: true,
      collapseInlineTagWhitespace: true,
      collapseWhitespace: true,
      decodeEntities: true,
      removeComments: true,
      sortAttributes: true,
      sortClassName: true,
      minifyCSS: (text) => transformCss(path, text),
      minifyJS: (text) => transformSync(text, { minify: true }).code,
      ...options,
    });

  return {
    name: "html-template",
    visitor: {
      TaggedTemplateExpression: {
        exit(path, state) {
          const {
            tag,
            quasi: { quasis, expressions },
          } = path.node;

          if (!t.isIdentifier(tag) || tag.name !== "html") {
            return;
          }

          const { file, filename = _filename } = state;
          const prefix = "_".repeat(file.code.length);

          const html = transformHtml(
            filename,
            quasis
              .map((quasi) => quasi.value.cooked!)
              .reduce((previous, current, i) => `${previous}${prefix}${i - 1}${prefix}${current}`),
          );

          const parts = html.split(new RegExp(`${prefix}(\\d+)${prefix}`, "g"));
          const _quasis = parts.filter((_, i) => !(i % 2));
          const length = _quasis.length;

          if (quasis.length !== length) {
            throw path.buildCodeFrameError("Invalid html template strings array.");
          }

          path.replaceWith(
            t.taggedTemplateExpression(
              tag,
              t.templateLiteral(
                _quasis.map((quasi, i) => t.templateElement({ raw: quasi, cooked: quasi }, i === length - 1)),
                parts.filter((_, i) => i % 2).map((i) => expressions[Number(i)]),
              ),
            ),
          );

          path.skip();
        },
      },
    },
  };
};
