FROM node:20-alpine

RUN apk add --no-cache tzdata

RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

WORKDIR /app

COPY src ./src
COPY app.js jsconfig.json package.json yarn.lock ./

RUN yarn install --frozen-lockfile

CMD ["node", "app.js"]
