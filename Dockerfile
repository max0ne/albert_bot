FROM node:8.9.3
LABEL AUTHOR Mingfei Huang himax1023@gmail.com

# setup app dir
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# move code into image
ADD . /usr/src/app

# npm install fails with official node image, workaround: replace `npm` with another one by `yarn install`
# https://github.com/cazala/coin-hive/issues/76
RUN yarn global add npm@5

# install alberteer first
WORKDIR /usr/src/app/alberteer
RUN npm i

WORKDIR /usr/src/app
RUN npm i

# Build Puppeteer stuff, Puppeteer requies some tricky steps
# copied from https://github.com/ebidel/try-puppeteer/blob/master/backend/Dockerfile
# See https://crbug.com/795759
RUN apt-get update && apt-get install -yq libgconf-2-4

# Install latest chrome dev package.
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
RUN apt-get update && apt-get install -y wget --no-install-recommends \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install -y google-chrome-unstable \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get purge --auto-remove -y curl \
  && rm -rf /src/*.deb

# Add pptr user.
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
  && mkdir -p /home/pptruser/Downloads \
  && chown -R pptruser:pptruser /home/pptruser \
  && chown -R pptruser:pptruser .

# Run user as non privileged.
USER pptruser

# AWS require to expose something
EXPOSE 80

CMD [ "npm", "start" ]
