// vite.config.ts
import { defineConfig } from "file:///D:/Users/23394/Documents/GitHub/snow/node_modules/vite/dist/node/index.js";
import { cpSync, existsSync } from "fs";
import { resolve } from "path";
import uniModule from "file:///D:/Users/23394/Documents/GitHub/snow/node_modules/@dcloudio/vite-plugin-uni/dist/index.js";
var __vite_injected_original_dirname = "D:\\Users\\23394\\Documents\\GitHub\\snow";
var uni = uniModule.default || uniModule;
function copyCloudFunctions() {
  const src = resolve(__vite_injected_original_dirname, "cloudfunctions");
  return {
    name: "copy-cloudfunctions",
    closeBundle() {
      if (!existsSync(src))
        return;
      const buildDest = resolve(__vite_injected_original_dirname, "dist/build/mp-weixin/cloudfunctions");
      try {
        cpSync(src, buildDest, { recursive: true });
      } catch {
      }
      const devDest = resolve(__vite_injected_original_dirname, "dist/dev/mp-weixin/cloudfunctions");
      try {
        cpSync(src, devDest, { recursive: true });
      } catch {
      }
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [
    uni(),
    copyCloudFunctions()
  ],
  resolve: {
    alias: {
      "@": "/src"
    }
  },
  test: {
    globals: true,
    environment: "node"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxVc2Vyc1xcXFwyMzM5NFxcXFxEb2N1bWVudHNcXFxcR2l0SHViXFxcXHNub3dcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXFVzZXJzXFxcXDIzMzk0XFxcXERvY3VtZW50c1xcXFxHaXRIdWJcXFxcc25vd1xcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovVXNlcnMvMjMzOTQvRG9jdW1lbnRzL0dpdEh1Yi9zbm93L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHsgY3BTeW5jLCBleGlzdHNTeW5jIH0gZnJvbSAnZnMnXHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJ1xyXG5pbXBvcnQgdW5pTW9kdWxlIGZyb20gJ0BkY2xvdWRpby92aXRlLXBsdWdpbi11bmknXHJcblxyXG5jb25zdCB1bmkgPSB1bmlNb2R1bGUuZGVmYXVsdCB8fCB1bmlNb2R1bGVcclxuXHJcbi8qKlxyXG4gKiBcdTVDMDYgY2xvdWRmdW5jdGlvbnMgXHU3NkVFXHU1RjU1XHU1MzlGXHU2ODM3XHU1OTBEXHU1MjM2XHU1MjMwXHU3RjE2XHU4QkQxXHU4RjkzXHU1MUZBXHU3NkVFXHU1RjU1XHVGRjA4XHU0RTBEXHU3RUNGXHU4RkM3XHU3RjE2XHU4QkQxXHVGRjA5XHJcbiAqL1xyXG5mdW5jdGlvbiBjb3B5Q2xvdWRGdW5jdGlvbnMoKSB7XHJcbiAgY29uc3Qgc3JjID0gcmVzb2x2ZShfX2Rpcm5hbWUsICdjbG91ZGZ1bmN0aW9ucycpXHJcbiAgcmV0dXJuIHtcclxuICAgIG5hbWU6ICdjb3B5LWNsb3VkZnVuY3Rpb25zJyxcclxuICAgIGNsb3NlQnVuZGxlKCkge1xyXG4gICAgICBpZiAoIWV4aXN0c1N5bmMoc3JjKSkgcmV0dXJuXHJcbiAgICAgIC8vIGJ1aWxkIFx1NkEyMVx1NUYwRlxyXG4gICAgICBjb25zdCBidWlsZERlc3QgPSByZXNvbHZlKF9fZGlybmFtZSwgJ2Rpc3QvYnVpbGQvbXAtd2VpeGluL2Nsb3VkZnVuY3Rpb25zJylcclxuICAgICAgdHJ5IHsgY3BTeW5jKHNyYywgYnVpbGREZXN0LCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KSB9IGNhdGNoIHt9XHJcbiAgICAgIC8vIGRldiBcdTZBMjFcdTVGMEZcclxuICAgICAgY29uc3QgZGV2RGVzdCA9IHJlc29sdmUoX19kaXJuYW1lLCAnZGlzdC9kZXYvbXAtd2VpeGluL2Nsb3VkZnVuY3Rpb25zJylcclxuICAgICAgdHJ5IHsgY3BTeW5jKHNyYywgZGV2RGVzdCwgeyByZWN1cnNpdmU6IHRydWUgfSkgfSBjYXRjaCB7fVxyXG4gICAgfSxcclxuICB9XHJcbn1cclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW1xyXG4gICAgdW5pKCksXHJcbiAgICBjb3B5Q2xvdWRGdW5jdGlvbnMoKSxcclxuICBdLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgICdAJzogJy9zcmMnLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHRlc3Q6IHtcclxuICAgIGdsb2JhbHM6IHRydWUsXHJcbiAgICBlbnZpcm9ubWVudDogJ25vZGUnLFxyXG4gIH0sXHJcbn0pXHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMFMsU0FBUyxvQkFBb0I7QUFDdlUsU0FBUyxRQUFRLGtCQUFrQjtBQUNuQyxTQUFTLGVBQWU7QUFDeEIsT0FBTyxlQUFlO0FBSHRCLElBQU0sbUNBQW1DO0FBS3pDLElBQU0sTUFBTSxVQUFVLFdBQVc7QUFLakMsU0FBUyxxQkFBcUI7QUFDNUIsUUFBTSxNQUFNLFFBQVEsa0NBQVcsZ0JBQWdCO0FBQy9DLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLGNBQWM7QUFDWixVQUFJLENBQUMsV0FBVyxHQUFHO0FBQUc7QUFFdEIsWUFBTSxZQUFZLFFBQVEsa0NBQVcscUNBQXFDO0FBQzFFLFVBQUk7QUFBRSxlQUFPLEtBQUssV0FBVyxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBQUEsTUFBRSxRQUFRO0FBQUEsTUFBQztBQUUzRCxZQUFNLFVBQVUsUUFBUSxrQ0FBVyxtQ0FBbUM7QUFDdEUsVUFBSTtBQUFFLGVBQU8sS0FBSyxTQUFTLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFBQSxNQUFFLFFBQVE7QUFBQSxNQUFDO0FBQUEsSUFDM0Q7QUFBQSxFQUNGO0FBQ0Y7QUFHQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxJQUFJO0FBQUEsSUFDSixtQkFBbUI7QUFBQSxFQUNyQjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSztBQUFBLElBQ1A7QUFBQSxFQUNGO0FBQUEsRUFDQSxNQUFNO0FBQUEsSUFDSixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsRUFDZjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
