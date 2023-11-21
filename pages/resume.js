import Image from 'next/image'
import Head from 'next/head'
import Layout from '../components/Navbar'

export default function About() {
  return (
    <>
      <Head>
        <title>Didik's Resume</title>
      </Head>
      <div>
        <h1>Didik's Resume</h1>
        <a href="https://drive.google.com/file/d/1SBObH3wRSB_wA0zITKxWOJG7MjeP6psV/view?usp=sharing" target="_blank">
                <a>Read Didik's CV</a>
        </a>
      </div>
    </>
  )
}