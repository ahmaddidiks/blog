import Head from 'next/head'
import Link from 'next/link'
import { getSlug, getPost } from '../lib/post'
import styles from '../styles/Home.module.css'

export async function getStaticProps() {
  const listSlug = await getSlug()
  let contents = []
  for (let slug of listSlug) {
    slug = slug.params.slug
    const listPost = await getPost(slug)
    contents.push({ slug, ...listPost })
  }
  return {
    props: {
      contents
    }
  }
}

export default function Home({ contents }) {
  return (
    <div className={styles.container}>
      <Head>
        <title>Didik's log</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <h2>Didik's log</h2>
      <ul>
        {
          contents ? (
            contents.map(content => {
              return (
                <li key={content.slug}><Link href={`/posts/${content.slug}`}><a>{content.title}</a></Link></li>
              )
            })
          ) : (
            <div>Loading ...</div>
          )
        }
      </ul>
    </div>
  )
}
