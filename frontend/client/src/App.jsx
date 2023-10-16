import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import {ethers} from 'ethers'
import { ToastContainer, toast } from 'react-toastify';
import { getAuthUrl, TwitterLookup, UpdateUser, getAccessToken, Drip, AddFaucetUser, GetUser, GetFaucetUserCount, GetDripAmount } from '../api/functions';
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
  const [userCount, setUserCount] = useState(null);
  const [dripAmount, setDripAmount] = useState(null)

  async function getUserCount() {
    const users = await GetFaucetUserCount();
    console.log(users.users)
    setUserCount(users.users);
  }

  async function getDripAmount() {
    const amount = await GetDripAmount();
    setDripAmount(amount.amount.toFixed(3))
  }

  useEffect(() => {
    // Scroll to bottom of the page
    window.scrollTo(0, document.body.scrollHeight);
    getDripAmount()

    // Scroll to top of the page after a delay
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1000); // Adjust delay as needed
  }, []);

  const tweetText = `I'm building on Scroll thanks to scrollsepoliafaucet.com!`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
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
              init();
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
      setCopy('Great! Now just connect your X account. This is just a one-time login to prevent thievery. We gotta be careful out here nowadays.');
    }
  }

  async function getSignature () {
    if(!signer) {
      await getSigner()
    }
    const message = Date.now().toString()
    const signature = await signer.signMessage(message)

    return {
      message: message,
      signature: signature
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
    setTwitter(result.data.username)
    setAuthUrl(null)

    toast.warn('Please sign in with MetaMask')
    setCopy('Please sign in with metaMask so we can verify you are who you say you are. Make sure to use this wallet to login in the future.')
    const signature = await getSignature();

    const addUser = await AddFaucetUser(userAddress, result.data.username, signature.message, signature.signature);
    const update = await UpdateUser(userAddress, 'twitter', result.data.username, signature.message, signature.signature);
    const updateUserId = await UpdateUser(userAddress, 'twitter_id', result.data.id, signature.message, signature.signature);
    const setAuthToken = await UpdateUser(userAddress, 'oauth_token', oauth_token, signature.message, signature.signature);
    const setAuthTokenSecret = await UpdateUser(userAddress, 'oauth_token_secret', oauth_token_secret, signature.message, signature.signature);

    toast.success('Login Complete!');

    setMessage(result.data.username);
    setCopy(`Pleasure to meet you, ${result.data.username}. Click the Drip button and you'll have your test ETH in no time.`);
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

    toast.success('Your ETH was delivered!')
    setCopy(`Your ETH has been delivered. Happy building, hope to see you tomorrow!`)


  }

  return (
    <>
    <div onLoad={() => getUserCount()}style={{alignItems: 'center', marginTop: '15%'}}>
      <img src='/images/scroll.svg' style={{width: '10em'}}/>
      <strong style={{width: '10em',padding: '5px', color: 'black', fontFamily: 'Courier New, monospace'}}>Sepolia Faucet</strong>
    </div>
      <div style={{borderRadius: '2%', padding: '5px', backgroundColor: '#FFE6C8',position: 'fixed', top: '2%', left: '2%', fontFamily: 'Courier New, monospace'}}><a href="https://twitter.com/0xlawson" target="_blank" rel="noopener noreferrer" style={{color: 'black', textDecoration: 'none'}}>Created by 0xLawson</a></div>
      <a style={{width: '12em', position: 'fixed', top: '2%', right: '2%', borderRadius: '2%', fontFamily: 'Courier New, monospace'}} href={url} target="_blank" rel="noopener noreferrer">Tweet About Us!</a>

      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
        <div style={{position:'fixed', backgroundColor: '#FFE6C8', width: '300px', height: '400px', borderRadius: '2%', border: '1px solid black', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', top: '20%'}}>
        <h2 style={{color: 'black'}}>{dripAmount} ETH / 24hrs</h2>
        <strong style={{display: authUrl == null ? '' : 'none' ,fontFamily: 'Courier New, monospace', color: 'black', marginTop: '-25%'}}>{copy}</strong>
        <strong style={{color: 'black', display: authUrl == null ? 'none' : '', fontFamily: 'Courier New, monospace'}}>Click <a href={authUrl} target='_blank'>here</a> to sign into X, then copy the code provided by X and paste it below.</strong>
        <input id='pin'style={{display: authUrl == null ? 'none' : '', marginTop: '15%', width: '60%', height: '10%', fontFamily: 'Courier New, monospace', color: 'black', backgroundColor: 'white', margin: 'auto'}} type="text" placeholder="Auth Code"/>
        <button onClick={() => userAddress == null ? init() : twitter == null ? twitterStep1() : twitter} style={{fontFamily: 'Courier New, monospace', display: twitter == null && authUrl == null ? '' : 'none'}}>
          {message}
        </button>
        <button style={{fontFamily: 'Courier New, monospace', display: authUrl == null ? 'none' : '' }} onClick={(e) => twitterStep2(e, accessToken)}>{'Submit Code'}</button>
        <button style={{fontFamily: 'Courier New, monospace', display: userAddress !== null && twitter !== null ? '' : 'none'}} onClick={() => drip()}>Drip</button>
        </div>
      </div>

      <div style={{display: userCount == null ? 'none' : 'flex', justifyContent: 'center', alignItems: 'center'}}>
        <strong style={{borderRadius: '2%', padding: '5px', color: 'black', backgroundColor: '#FFE6C8',position: 'fixed', bottom: '2%', fontFamily: 'Courier New, monospace'}}>Supporting {userCount} builders on Scroll 💪</strong>
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