// @flow
import React, { useEffect, useState } from "react"
import Annotator from "../Annotator"
import { MagicWand } from "./MagicWand"

const API = process.env.REACT_APP_TAROT_API || "https://tarot.varyshop.eu"
async function getImages() {
  try {
    const res = await fetch(`${API}/api/decks/1`, { mode: 'cors', headers: { 'Content-Type': 'application/json' } })
    const data = await res.json()

    return data.cards.map(card => {
      const data = JSON.parse(card.data)

      return {
        ...card,
        src: `${API}${card.src}`,
        ...data
      }
    })
  } catch (err) {
    console.log(err)
    return []
  }
}

export default () => {
  const [selectedImage, setSelectedImage] = useState(1)
  const [images, setImages] = useState([])
  const loadImages = async () => {
    try {
      const images = await getImages()
      // To avoid cross origin canvas error predownload images and give them local url
      const downloadedImages = await Promise.all(
        images.map(async (image) => {
          const res = await fetch(image.src)
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          return {
            ...image,
            src: url
          }
        })
      )
      setImages(downloadedImages)
    } catch (err) {
      console.log(err)
    }
  }
  useEffect(() => {
    loadImages()
  }, [])

  const saveImage = async (image) => {
    try {
      const { id, regions, pixelSize } = image
      const res = await fetch(`${API}/api/cards/${id}`, {
        method: 'PUT',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regions,
          pixelSize
        })
      })
      const data = await res.json()
      console.log(data)
    } catch (err) {
      console.log(err)
    }
  }

  if (!images.length) return <div>Loading...</div>

  return (
    <div>
      <MagicWand image={images.at(selectedImage)} />
      <Annotator
        showTags
        allowComments
        isLabelOn
        hideClone
        labelImages
        hideNext={selectedImage === images.length - 1}
        hidePrev={selectedImage === 0}
        hideSettings={false}
        // imageClsList={["test"]}
        // regionClsList={[...new Set(images.map(i => i.regions.map(r => r.cls)).flat())]}
        // imageTagList={["test"]}
        // regionTagList={["test"]}
        enabledTools={["create-polygon", "select"]}
        images={images}
        selectedImage={selectedImage}
        onChange={(state) => console.log({ staeChange: state })}
        onImageChange={newIndex => console.log({ newIndex })}
        onExit={(state) => {
          saveImage(state.images[state.selectedImage])
        }}
        onNextImage={(state) => {
          setSelectedImage(i => i + 1)
          saveImage(state.images[state.selectedImage])
        }}
        onPrevImage={(state) => {
          setSelectedImage(i => i - 1)
          saveImage(state.images[state.selectedImage])
        }}
      />
    </div>
  )
}
