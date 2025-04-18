// const config = {
//   plugins: ["@tailwindcss/postcss"],
// };

// export default config;

// Modify for deployment purposes

const config = {
  plugins: {
    'postcss-nesting': {},
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};

export default config;