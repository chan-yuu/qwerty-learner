FROM node:20 AS build

# 设置工作目录
WORKDIR /app

COPY . .
RUN yarn config set registry https://registry.npmmirror.com
RUN yarn install --frozen-lockfile
RUN yarn build

# 将构建好的 React 应用复制到 Nginx 容器的默认站点目录
FROM nginx:alpine
COPY ./public/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /app
