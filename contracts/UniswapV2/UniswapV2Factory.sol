// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "./UniswapV2Pair.sol";

contract UniswapV2Factory is IUniswapV2Factory {
    address public feeTo;
    address public feeToSetter;
    address public WCHZ; // Global WCHZ token address

    mapping(address => address) public getPairWithWCHZ; // tokenA => pair address (since tokenB is always WCHZ)
    address[] public allPairs;

    constructor(address _feeToSetter, address _WCHZ) {
        feeToSetter = _feeToSetter;
        WCHZ = _WCHZ;
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function createPairWithWCHZ(address tokenA) external returns (address pair) {
        require(tokenA != WCHZ, 'UniswapV2: IDENTICAL_ADDRESSES');
        require(tokenA != address(0), 'UniswapV2: ZERO_ADDRESS');
        require(WCHZ != address(0), 'UniswapV2: WCHZ_NOT_SET');
        require(getPairWithWCHZ[tokenA] == address(0), 'UniswapV2: PAIR_EXISTS');
        
        // Always ensure tokenA < WCHZ for consistent ordering
        (address token0, address token1) = tokenA < WCHZ ? (tokenA, WCHZ) : (WCHZ, tokenA);
        
        bytes memory bytecode = type(UniswapV2Pair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IUniswapV2Pair(pair).initialize(token0, token1);
        getPairWithWCHZ[tokenA] = pair;
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    // Override the original createPair function to maintain interface compatibility
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenB == WCHZ, 'UniswapV2: TOKENB_MUST_BE_WCHZ');
        require(tokenA != WCHZ, 'UniswapV2: IDENTICAL_ADDRESSES');
        require(tokenA != address(0), 'UniswapV2: ZERO_ADDRESS');
        require(WCHZ != address(0), 'UniswapV2: WCHZ_NOT_SET');
        require(getPairWithWCHZ[tokenA] == address(0), 'UniswapV2: PAIR_EXISTS');
        
        // Always ensure tokenA < WCHZ for consistent ordering
        (address token0, address token1) = tokenA < WCHZ ? (tokenA, WCHZ) : (WCHZ, tokenA);
        
        bytes memory bytecode = type(UniswapV2Pair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IUniswapV2Pair(pair).initialize(token0, token1);
        getPairWithWCHZ[tokenA] = pair;
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, 'UniswapV2: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, 'UniswapV2: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }

    // Override the getPair function to work with WCHZ pairs
    function getPair(address tokenA, address tokenB) external view returns (address pair) {
        if (tokenB == WCHZ) {
            return getPairWithWCHZ[tokenA];
        } else if (tokenA == WCHZ) {
            return getPairWithWCHZ[tokenB];
        }
        return address(0);
    }
} 