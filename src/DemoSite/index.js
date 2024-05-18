// @flow
import React, { useEffect, useState } from "react"
import Annotator from "../Annotator"

const API = "http://localhost:3000"
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
  const [selectedImage, setSelectedImage] = useState(0)
  const [images, setImages] = useState([])
  const loadImages = async () => {
    try {
      const images = await getImages()
      console.log(images)
      setImages(images)
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
      <Annotator
        labelImages
        showTags
        allowComments
        isLabelOn
        hideClone
        hideNext={selectedImage === images.length - 1}
        hidePrev={selectedImage === 0}
        hideSettings

        imageClsList={[]}
        regionClsList={[...new Set(images.map(i => i.regions.map(r => r.cls)).flat())]}
        enabledTools={["create-polygon", "select"]}
        images={images}
        selectedImage={selectedImage}
        onExit={(state) => {
          saveImage(state.images[state.selectedImage])
          console.log(state)
        }}
        onChange={(state) => console.log(state)}
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
