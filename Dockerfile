FROM node:10.19.0

# Create app directory
WORKDIR /app

COPY . .

WORKDIR /app/frontend

RUN npm install
RUN npm run build

WORKDIR /app/backend
RUN npm install

EXPOSE 443
EXPOSE 40000-49999/udp
ENV PORT=443

ENV MODE=deploy

CMD [ "node", "server.js" ]
