/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize pdf-parse and pdf.js for Node.js runtime
      config.externals = config.externals || [];
      config.externals.push({
        "pdf-parse": "commonjs pdf-parse",
        "pdf.js": "commonjs pdf.js",
      });
    }
    return config;
  },
};

module.exports = nextConfig;
