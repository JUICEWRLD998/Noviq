// AUTO-GENERATED from contracts/out/PolicyGuard.sol/PolicyGuard.json — do not edit by hand.
export const policyGuardAbi = [
  {
    "type": "function",
    "name": "checkAndRecord",
    "inputs": [
      {
        "name": "target",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "approved",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "decodeAction",
    "inputs": [
      {
        "name": "target",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct ActionInfo",
        "components": [
          {
            "name": "asset",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "selector",
            "type": "bytes4",
            "internalType": "bytes4"
          }
        ]
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "getAssetLimit",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "allowed",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "perTxCap",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "dailyCap",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getConfig",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct PolicyConfig",
        "components": [
          {
            "name": "active",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "windowDuration",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "largeActionThreshold",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "timelockDelay",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "recipientAllowlistEnabled",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "selectorAllowlistEnabled",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "targetAllowlistEnabled",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSpendWindow",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct SpendWindow",
        "components": [
          {
            "name": "windowStart",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "spent",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isActive",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isRecipientAllowed",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "largeActionThreshold",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setPolicy",
    "inputs": [
      {
        "name": "config",
        "type": "tuple",
        "internalType": "struct PolicyConfig",
        "components": [
          {
            "name": "active",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "windowDuration",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "largeActionThreshold",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "timelockDelay",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "recipientAllowlistEnabled",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "selectorAllowlistEnabled",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "targetAllowlistEnabled",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      },
      {
        "name": "limits",
        "type": "tuple[]",
        "internalType": "struct AssetLimit[]",
        "components": [
          {
            "name": "asset",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "perTxCap",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "dailyCap",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      },
      {
        "name": "recipients",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "selectors",
        "type": "bytes4[]",
        "internalType": "bytes4[]"
      },
      {
        "name": "targets",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "simulate",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "target",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "allowed",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "code",
        "type": "uint8",
        "internalType": "enum ReasonCode"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "timelockDelay",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "ActionAllowed",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PolicySet",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "assetCount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "recipientCount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "PolicyViolation",
    "inputs": [
      {
        "name": "code",
        "type": "uint8",
        "internalType": "enum ReasonCode"
      }
    ]
  }
] as const
