#FROM node:alpine AS app

#WORKDIR /usr/share/lastfm

#COPY ./backend /usr/share/lastfm/backend

#RUN npm --prefix ./backend install

#RUN npm --prefix ./backend run build



#FROM nginx:alpine

#COPY --from=app /usr/share/lastfm/backend /usr/share/lastfm/backend
#COPY ./frontend/dist /usr/share/lastfm/frontend/dist

#RUN ls /usr/share/nginx/html

#COPY ./nginx.conf /etc/nginx/conf.d/default.conf

#EXPOSE 80

FROM node:18-alpine AS build-frontend

WORKDIR /app/frontend

RUN npm install -g @angular/cli

COPY frontend/package*.json ./

RUN npm install

COPY frontend .

RUN ng build --configuration production

FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=build-frontend /app/frontend/dist /app/frontend/dist

COPY backend /app/backend

WORKDIR /app/backend
RUN npm install

EXPOSE 3000

CMD [ "node", "src/server.js" ]
