FROM node:22-bookworm-slim
WORKDIR /opt/global-fusion
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY src/ ./src/
COPY schemas/ ./schemas/
USER node
EXPOSE 8787
# Loopback remains the safe default. For a container-facing API, explicitly
# supply serve --host 0.0.0.0 --allow-insecure-remote and FUSION_API_TOKEN,
# and terminate TLS upstream. Never place the token in an image or build arg.
ENTRYPOINT ["node", "src/cli.mjs"]
CMD ["serve"]
