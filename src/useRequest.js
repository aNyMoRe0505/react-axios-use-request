import {
  useReducer,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import axios, { CancelToken } from 'axios';

const getInitialState = (initialValue = null) => ({
  loading: false,
  error: null,
  data: initialValue,
});

const getReducer = (dataUpdater, initialState) => (state, action) => {
  switch (action.type) {
    case 'fetching':
      return {
        ...state,
        error: null,
        loading: true,
      };

    case 'success': {
      const result = dataUpdater(state.data, action.data);
      return {
        ...state,
        loading: false,
        error: null,
        data: result,
      };
    }

    case 'cacheUpdate': {
      const result = dataUpdater(action.originalStateData, action.data);
      return {
        ...state,
        loading: false,
        error: null,
        data: result,
      };
    }

    case 'failed':
      return {
        ...state,
        loading: false,
        error: action.error,
        data: initialState.data,
      };

    case 'abort':
      return {
        ...state,
        loading: false,
      };

    case 'reset':
      return initialState;

    case 'updateData':
      return {
        ...state,
        data: action.newData,
      };

    default:
      throw new Error('Unrecognized action type');
  }
};

const supportedCachePolicy = ['no-cache', 'cache-and-network'];

const supportedOptions = {
  getRequestPayload: null,
  cachePolicy: supportedCachePolicy[0],
  dataUpdater: (currentData, responseData) => responseData,
  initialData: null,
  onAbort: () => {},
  axiosInstance: axios,
};

const validateOptions = (options) => {
  const optionKeys = Object.keys(options);
  const currentSupportOptionKeys = Object.keys(supportedOptions);

  optionKeys.forEach((key) => {
    if (!currentSupportOptionKeys.includes(key)) throw new Error(`Invalid option ${key}`);
  });

  const {
    cachePolicy,
    dataUpdater,
    onAbort,
    getRequestPayload,
    axiosInstance,
  } = options;

  if (typeof dataUpdater !== 'function') throw new Error("dataUpdater's type should be function");
  if (typeof getRequestPayload !== 'function') throw new Error("getRequestPayload's type should be function");
  if (typeof onAbort !== 'function') throw new Error("onAbort's type should be function");
  if (typeof axiosInstance !== 'function') throw new Error("axiosInstance's type should be function");
  if (typeof cachePolicy !== 'string' || !supportedCachePolicy.includes(cachePolicy)) throw new Error('Unrecognized cachePolicy');
};

// optionsPayload recommend be outside of component, remain same reference
const useRequest = (
  optionPayload = supportedOptions,
) => {
  const options = useMemo(() => ({
    ...supportedOptions,
    ...optionPayload,
  }), [optionPayload]);

  const optionsRef = useRef(options);

  useEffect(() => {
    validateOptions(options);
    optionsRef.current = options;
  }, [options]);

  // 這邊可能會有點問題，只會執行一次，optionRef.current 只會是第一次帶進來時的值
  const initialState = useMemo(() => getInitialState(optionsRef.current.initialData), []);
  const reducer = useMemo(() => getReducer(optionsRef.current.dataUpdater, initialState), [initialState]);

  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const axiosSource = useRef(null);

  const doRequest = useCallback(async (...params) => {
    try {
      let response;
      const cacheKey = JSON.stringify(optionsRef.current.getRequestPayload(...params));
      const targetCahce = sessionStorage?.getItem(cacheKey);

      const doRealRequest = async (isBackgroundRequest = false, originalStateData = optionsRef.current.initialData) => {
        if (!isBackgroundRequest) dispatch({ type: 'fetching' });
        axiosSource.current = CancelToken.source();

        const axiosRequestPayload = {
          ...optionsRef.current.getRequestPayload(...params),
          cancelToken: axiosSource.current.token,
        };

        response = await optionsRef.current.axiosInstance(axiosRequestPayload);

        if (!isBackgroundRequest) {
          dispatch({ type: 'success', data: response?.data });
        } else if (JSON.stringify(response) !== targetCahce) {
          dispatch({ type: 'cacheUpdate', data: response?.data, originalStateData });
        }
      };

      const doCacheRequest = () => {
        response = JSON.parse(targetCahce);
        dispatch({ type: 'success', data: response?.data });
      };

      const cacheResponse = () => {
        if (sessionStorage) {
          sessionStorage.setItem(cacheKey, JSON.stringify(response));
        }
      };

      switch (optionsRef.current.cachePolicy) {
        case supportedCachePolicy[0]:
          await doRealRequest();
          break;

        case supportedCachePolicy[1]: {
          if (targetCahce) {
            const originalData = stateRef.current.data;
            doCacheRequest();
            doRealRequest(true, originalData)
              .then(() => cacheResponse());
          } else {
            await doRealRequest();
            cacheResponse();
          }
          break;
        }

        default:
          throw new Error('Unrecognized cachePolicy');
      }

      return Promise.resolve(response);
    } catch (error) {
      if (axios.isCancel(error)) {
        dispatch({ type: 'abort' });
      } else {
        dispatch({ type: 'failed', error: error.response?.data?.error });
      }
      return Promise.reject(error);
    } finally {
      axiosSource.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  const abort = useCallback(() => {
    if (axiosSource.current) {
      axiosSource.current.cancel();
      optionsRef.current.onAbort();
    } else {
      throw new Error('No pending request');
    }
  }, []);

  const updateData = useCallback((newData) => {
    dispatch({ type: 'updateData', newData });
  }, []);

  return {
    ...state,
    doRequest,
    reset,
    abort,
    updateData,
  };
};

export default useRequest;
