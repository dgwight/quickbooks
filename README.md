# Otechie API

## Quickstart

```sh
yarn
yarn offline
lsof -n -i4TCP:8000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

