import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import {ethers} from 'ethers'
import { ToastContainer, toast } from 'react-toastify';
import { getAuthUrl, TwitterLookup, UpdateUser, getAccessToken, Drip, AddFaucetUser, GetUser } from '../api/functions';
import 'react-toastify/dist/ReactToastify.css';
import './App.css'

let provider, signer = null;
const explorerURL = 'https://sepolia-blockscout.scroll.io/tx/'

function App() {
  const [userAddress, setUserAddress] = useState(null);
  const [authUrl, setAuthUrl] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [twitter, setTwitter] = useState(null);
  const [message, setMessage] = useState('Connect Wallet');
  const [copy, setCopy] = useState('Welcome to this humble establishment. It appears you need some more test ETH to continue building your next groundbreaking app. Feel free to top up every 24 hours! Simply connect your wallet to continue.')

  async function init() {
    if(userAddress !== null) return;

    if (window.ethereum == null) {
      toast.error("MetaMask not installed");
    } else {
      provider = new ethers.BrowserProvider(window.ethereum);
      const nw = await provider.getNetwork();
      signer = await provider.getSigner();

      // Check if the network is correct, if not, change it
      if (Number(nw.chainId) !== 534351) {
        toast.warn('Switching Networks')
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x8274f' }],
          })
          // window.location.reload();
          provider = new ethers.BrowserProvider(window.ethereum);

        } catch (switchError) {
          console.log({ switchError })
          if (switchError.code === 4902) {
            toast.warn('Adding Scroll Sepolia to your MetaMask');
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{ 
                  chainId: '0x8274f',
                  chainName: 'Scroll Sepolia Testnet',
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['https://sepolia-rpc.scroll.io'],
                  blockExplorerUrls: ['https://sepolia-blockscout.scroll.io']
                }],
              });
              window.location.reload();
  
              provider = new ethers.BrowserProvider(window.ethereum);
            } catch (addError) {
              toast.error('There was an error adding the network, please refresh and try again.');
              console.error(addError);
            }
          }
        }
      }

      signer = await provider.getSigner();
      setUserAddress(await signer.getAddress());
      const user = await GetUser(await signer.getAddress());
      if(user !== null) {
        setTwitter(user.handle)
        toast.success(`Welcome Back ${user.handle}!`);
        setCopy(`Good to see ya again, ${user.handle}. Click the Drip button and you'll have your test ETH in no time.`);
        setMessage(user.handle);
        return;
      }

      setMessage('Connect X');
      toast.success("Wallet Connected!");
      setCopy('Great! Now just connect your X account. This is to prevent thievery. We gotta be careful out here nowadays.');
    }
  }

  async function twitterStep1() {
    if(userAddress == null) {
      await init()
    }
    if(twitter != null) {
      return
    }
    const data = await getAuthUrl()
    let token = data.requestToken.oauth_token
    let token_secret = data.requestToken.oauth_token_secret
    setAuthUrl(data.authUrl)
    let accessTokenObj = {
        token,
        token_secret
    }
    setAccessToken(accessTokenObj)
  }

  async function twitterStep2(event, requestToken) {
    event.preventDefault()
    try{
    const pin = document.getElementById('pin').value
    const accessToken = await getAccessToken(parseInt(pin), requestToken.token)

    let oauth_token = accessToken.oauth_token
    let oauth_token_secret = accessToken.oauth_token_secret

    const result = await TwitterLookup(oauth_token, oauth_token_secret)
    const update = await UpdateUser(userAddress, 'twitter', result.data.username)
    const updateUserId = await UpdateUser(userAddress, 'twitter_id', result.data.id)
    const setAuthToken = await UpdateUser(userAddress, 'oauth_token', oauth_token)
    const setAuthTokenSecret = await UpdateUser(userAddress, 'oauth_token_secret', oauth_token_secret)

    setTwitter(result.data.username)
    setAuthUrl(null)
    const addUser = await AddFaucetUser(userAddress, result.data.username)
    toast.success('X Connected!')

    setMessage(result.data.username);
    setCopy(`Pleasure to meet you, ${user.handle}. Click the Drip button and you'll have your test ETH in no time.`);
    return result
    } catch (error) {
        console.log(error)
        toast.error(error)
    }
  }

  async function drip() {
    const tx = await Drip(twitter, userAddress);

    if(tx.error) {
      if(tx.error.error) {
        toast.error(tx.error.error.reason);
        if(tx.error.error.reason.includes('come back later')) {
          setCopy(`Whoa there, looks like you've had your fill for today. Come back again tomorrow.`)
        }
        return;
      }
      toast.error(tx.error);
      return;
    }

    setCopy(`Your ETH has been delivered. Happy building, hope to see you tomorrow!`)
  }

  return (
    <>
      
      <strong style={{padding: '5px', color: 'black', backgroundColor: '#FFE6C8',position: 'fixed', top: '1%', left: '2%', fontFamily: 'Courier New, monospace'}}>Scroll Sepolia Faucet</strong>
      <div style={{padding: '5px', backgroundColor: '#FFE6C8',position: 'fixed', top: '7%', left: '2%', fontFamily: 'Courier New, monospace'}}><a href="https://twitter.com/0xlawson" target="_blank" rel="noopener noreferrer" style={{color: 'black', textDecoration: 'none'}}>Follow creator on X</a></div>

      <div style={{position: 'fixed', top: '1%', right: '2%'}}>
        <button onClick={() => userAddress == null ? init() : twitter == null ? twitterStep1() : twitter} style={{fontFamily: 'Courier New, monospace'}}> 
          {message}
        </button>
      </div>

      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
        <div style={{position:'fixed', backgroundColor: '#FFE6C8', width: '300px', height: '400px', border: '1px solid black', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
        <h2 style={{color: 'black'}}>0.01 ETH / 24hrs</h2>
        <strong style={{display: authUrl == null ? '' : 'none' ,fontFamily: 'Courier New, monospace', color: 'black', marginTop: '-25%'}}>{copy}</strong>
        <p style={{color: 'black', display: authUrl == null ? 'none' : ''}}>Click <a href={authUrl} target='_blank'>here</a> to sign into X, then copy the code provided by X and paste it below.</p>
        <input id='pin'style={{display: authUrl == null ? 'none' : '', marginTop: '15%', width: '60%', height: '10%', fontFamily: 'Courier New, monospace', color: 'black', backgroundColor: 'white', margin: 'auto'}} type="text" placeholder="Auth Code"/>
        <button onClick={() => userAddress == null ? init() : twitter == null ? twitterStep1() : twitter} style={{fontFamily: 'Courier New, monospace', display: twitter == null && authUrl == null ? '' : 'none'}}>
          {message}
        </button>
        <button style={{fontFamily: 'Courier New, monospace', display: authUrl == null ? 'none' : '' }} onClick={(e) => twitterStep2(e, accessToken)}>{'Submit Code'}</button>
        <button style={{fontFamily: 'Courier New, monospace', display: userAddress !== null && twitter !== null ? '' : 'none'}} onClick={() => drip()}>Drip</button>
        </div>
      </div>

      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />    
    </>
  )
}

export default App