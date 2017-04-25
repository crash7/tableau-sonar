# tableu-sonar

Web Data Connector to retrieve data from Sonar.

![screenshoot](https://cloud.githubusercontent.com/assets/1450075/23081446/99477c64-f533-11e6-8137-61131b895714.png)


## Troubleshooting

### The Sonar server doesn't send the `Access-Control-Allow-Origin` header

1. Install the [nocors](https://www.npmjs.com/package/nocors) module:
  `npm install nocors -g`
2. Use it to proxy the url of your sonar instance:
  `nocors --port 4000 --endpoint http://sonar.example.com`
3. Use `http://localhost:4000` inside the Web Connector Interactive Phase

