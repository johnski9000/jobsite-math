# Runs the published jobsite-math-mcp server over stdio.
FROM node:22-alpine
RUN npm install -g jobsite-math-mcp@0.1.1 && npm cache clean --force
USER node
ENTRYPOINT ["jobsite-math-mcp"]
