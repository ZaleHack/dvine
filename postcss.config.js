import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const plugins = [tailwindcss(), autoprefixer()];

const config = {
  plugins,
  // Specify the source filename to avoid PostCSS warnings about missing
  // `from` when processing CSS. Using `undefined` tells PostCSS not to expect
  // a file path and suppresses the warning.
  from: undefined,
};

export default config;
