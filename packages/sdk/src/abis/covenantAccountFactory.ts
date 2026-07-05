// AUTO-GENERATED from contracts/out/CovenantAccountFactory.sol/CovenantAccountFactory.json — do not edit by hand.
export const covenantAccountFactoryAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "guard_",
        "type": "address",
        "internalType": "contract IPolicyGuard"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "accountsCount",
    "inputs": [],
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
    "name": "accountsOf",
    "inputs": [
      {
        "name": "owner_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allAccounts",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createAccount",
    "inputs": [
      {
        "name": "owner_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "agent_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "acct",
        "type": "address",
        "internalType": "contract CovenantAccount"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "guard",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IPolicyGuard"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "AccountCreated",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "agent",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  }
] as const
