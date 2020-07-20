# react-axios-use-request
React hook for managing http requests with axios

## Installation
You need to install axios too

`yarn add react-axios-use-request axios`

`npm install react-axios-use-request axios --save`

## Usage
```js
import React from 'react'
import useRequest from 'react-axios-use-request';

const getPostComments = (postId) => ({
  method: 'get',
  url: `https://jsonplaceholder.typicode.com/posts/${postId}/comments`,
});

const options = {
  getRequestPayload: getPostComments,
  cachePolicy: 'no-cache',
  dataUpdater: (currentData, responseData) => responseData,
  initialData: null,
  onAbort: () => {},
};

function App () {
  const {
    loading,
    error,
    data,
    doRequest,
    reset,
    abort,
  } = useRequest(options);
  
  if (loading) return ...

  if (error) return ...
  
  console.log(data);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          doRequest(1)
            .then((r) => console.log(r))
            .catch((e) => console.log(e));
        }}
      >
        fetching
      </button>
      <button type="button" onClick={abort}>
        abort
      </button>
      <button type="button" onClick={reset}>
        reset
      </button>
    </>
  )
} 
```
## Supported Options
| name | type | defaultValue | required | description |
| -- | -- | -- | -- | -- |
| getRequestPayload | function | null | v | A function return [axios request config](https://github.com/axios/axios#request-config) |
| cachePolicy | string | no-cache | | These will be the same ones as Apollo's [fetch policies](https://www.apollographql.com/docs/react/api/react/hoc/#optionsfetchpolicy). Currently only supports `no-cache` or `cache-and-network` |
| dataUpdater | function | (currentData, responseData) => responseData | | Merges the current data with the response data |
| initialData | any | null | | Set a default value for data |
| onAbort | function | empty function | | Runs when the request is aborted |
| axiosInstance | function | original axios instance | | [You can create your own axios instance](https://github.com/axios/axios#creating-an-instance) |

### Notice
It is recommended that your `options` object should be outside of component, remain same reference.
```js
import React from 'react'
import useRequest from 'react-axios-use-request';

const getPostComments = (postId) => ({
  method: 'get',
  url: `https://jsonplaceholder.typicode.com/posts/${postId}/comments`,
});

const options = {
  getRequestPayload: getPostComments,
};

function App () {
  const {
    loading,
    error,
    data,
    doRequest,
    reset,
    abort,
  } = useRequest(options);
  ...
} 
```
Or you can use `useMemo` to wrap your options and pass necessary props to dependency array
```js
const options = useMemo(() => ({
  getRequestPayload: getPostViaUserId,
}), []);
```

## Supported API
| name | description |
| -- | -- |
| loading | loading status |
| error | error |
| data | data |
| doRequest | function that trigger request |
| reset | function that reset `data`, `loading`, `error` |
| abort | function that can abort request |

### Notice
`doRequest` will return Promise in the end, so if you want to do something after request success..
```js
doRequest().then((r) => do something after success).catch((e) => do something when error)
```

`doRequest`、`reset`、`abort` These functions identity are stable and won’t change on re-renders.
So you can safe to include or omit from the useEffect dependency list
```js
useEffect(() => {
  doRequest(userId);
}, [doRequest, userId]);
```
