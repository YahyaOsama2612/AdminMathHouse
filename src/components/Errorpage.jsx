import React from 'react';
import styled from 'styled-components';

const Errorpage = () => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        
        <StyledWrapper>
          <div className="flex justify-center mb-4">
            <div className="error-icon">⚠️</div>
          </div>

          <div className="loader">
            <div className="ring outer">
              <div className="item item-1"><span className="symbol">∫</span></div>
              <div className="item item-2"><span className="symbol">∑</span></div>
              <div className="item item-3"><span className="symbol">∂</span></div>
            </div>
            <div className="ring middle">
              <div className="item item-1"><span className="symbol">π</span></div>
              <div className="item item-2"><span className="symbol">e</span></div>
            </div>
            <div className="ring inner">
              <div className="item item-1"><span className="symbol">∞</span></div>
              <div className="item item-2"><span className="symbol">√</span></div>
            </div>
            <div className="core" />
          </div>
        </StyledWrapper>

        <div className="mt-6 text-center">
          <h1 className="text-2xl font-bold text-red-600">
            API Request Failed
          </h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Something went wrong while fetching data.  
            Please check your internet connection or try again.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all duration-300"
            >
              Retry
            </button>

            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-all duration-300"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StyledWrapper = styled.div`
  :root {
    --color-one: #dc2626;
    --color-two: #2563eb;
    --color-three: #16a34a;
    --color-four: #9333ea;
  }

  .loader {
    position: relative;
    width: 160px;
    height: 160px;
    margin: auto;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    animation: colorShift 6s infinite linear;
  }

  .ring {
    position: absolute;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: spin 10s linear infinite;
  }

  .outer {
    width: 150px;
    height: 150px;
    border: 2px solid var(--dynamic-color);
    box-shadow: 0 0 15px var(--dynamic-color);
  }

  .middle {
    width: 110px;
    height: 110px;
    border: 2px dashed var(--dynamic-color);
    box-shadow: 0 0 10px var(--dynamic-color);
    animation-direction: reverse;
  }

  .inner {
    width: 70px;
    height: 70px;
    border: 2px solid var(--dynamic-color);
    box-shadow: 0 0 8px var(--dynamic-color);
  }

  .symbol {
    color: var(--dynamic-color);
    text-shadow: 0 0 8px var(--dynamic-color);
    font-weight: bold;
  }

  .item {
    position: absolute;
    top: 50%;
    left: 50%;
    transform-origin: 0 0;
  }

  .outer .item-1 { transform: rotate(0deg) translate(0, -75px); }
  .outer .item-2 { transform: rotate(120deg) translate(0, -75px); }
  .outer .item-3 { transform: rotate(240deg) translate(0, -75px); }

  .middle .item-1 { transform: rotate(0deg) translate(0, -55px); }
  .middle .item-2 { transform: rotate(180deg) translate(0, -55px); }

  .inner .item-1 { transform: rotate(90deg) translate(0, -35px); }
  .inner .item-2 { transform: rotate(270deg) translate(0, -35px); }

  .core {
    position: absolute;
    width: 12px;
    height: 12px;
    background: var(--dynamic-color);
    border-radius: 50%;
    box-shadow: 0 0 10px var(--dynamic-color), 0 0 25px var(--dynamic-color);
    animation: pulse 2s infinite;
  }

  .error-icon {
    font-size: 42px;
    animation: shake 0.8s ease-in-out infinite alternate;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0% { transform: scale(1); opacity: 0.7; }
    50% { transform: scale(1.4); opacity: 1; }
    100% { transform: scale(1); opacity: 0.7; }
  }

  @keyframes colorShift {
    0%   { --dynamic-color: var(--color-one); }
    25%  { --dynamic-color: var(--color-two); }
    50%  { --dynamic-color: var(--color-three); }
    75%  { --dynamic-color: var(--color-four); }
    100% { --dynamic-color: var(--color-one); }
  }

  @keyframes shake {
    0% { transform: translateX(0); }
    50% { transform: translateX(-4px); }
    100% { transform: translateX(4px); }
  }
`;

export default Errorpage;