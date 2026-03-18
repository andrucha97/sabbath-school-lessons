FROM node:16.13.1

RUN printf '%s\n' \
  'deb http://archive.debian.org/debian buster main contrib non-free' \
  'deb http://archive.debian.org/debian buster-updates main contrib non-free' \
  'deb http://archive.debian.org/debian-security buster/updates main contrib non-free' \
  > /etc/apt/sources.list && \
  printf 'Acquire::Check-Valid-Until "false";\nAcquire::Retries "3";\n' \
  > /etc/apt/apt.conf.d/99archive

ARG HUGO_VERSION=0.55.6
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget xz-utils && \
    wget -O /tmp/hugo.tar.gz "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_Linux-64bit.tar.gz" && \
    tar -xzf /tmp/hugo.tar.gz -C /usr/local/bin hugo && \
    rm -rf /var/lib/apt/lists/* /tmp/hugo.tar.gz

WORKDIR /app

COPY package*.json ./
RUN sed -i '/"@Adventech\/bible-tools":/d' package.json
RUN npm ci || npm install

COPY . .
RUN chmod +x entrypoint.sh

CMD ["/bin/sh", "entrypoint.sh"]