/** @type {import('next').NextConfig} */
export default {
  images: { unoptimized: true },
  trailingSlash: true,
  // lib/data.ts reads these from disk when GitHub does not answer. Only they ship with the server code, not the whole project.
  outputFileTracingIncludes: { '/*': ['./data/published/**/*', './data/chain/**/*', './contract/deployment.json'] },
};
