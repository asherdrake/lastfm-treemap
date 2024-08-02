FROM node:alpine AS app

WORKDIR /usr/frontend/src/app

COPY . /usr/frontend/src/app/

RUN npm install

RUN npm run build



FROM nginx:alpine

COPY --from=app /usr/frontend/src/app/dist/angular-docker/browser /usr/share/nginx/html

RUN ls /usr/share/nginx/html

COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80