import { CDN, IMG_COMPRESS_WIDTH } from '@/config'
import useModel from '@/hooks/useModel'
import settingModel from '@/models/setting'
import muiStyled from '@/muiStyled'
import { getEnhancedImage, getFaces } from '@/services/post'
import { UBBReact } from '@/UBB'
import { IPost } from '@cc98/api'
import { Typography } from '@mui/material'
import React, { useState } from 'react'
import LazyLoad from 'react-lazyload'
import { PhotoProvider, PhotoView } from 'react-photo-view'
import 'react-photo-view/dist/react-photo-view.css'
import MarkdownView from 'react-showdown'
import styled from 'styled-components'
import HdrPlusIcon from '@mui/icons-material/HdrPlusOutlined'
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNaturalOutlined'
import RotateRightIcon from '@mui/icons-material/RotateRightOutlined'
import ZoomInIcon from '@mui/icons-material/ZoomInOutlined'
import ZoomOutIcon from '@mui/icons-material/ZoomOutOutlined'


const Overlay = styled.div`
  box-sizing: border-box;
  position: absolute;
  left: 0;
  bottom: 0;
  padding: 10px;
  width: 100%;
  min-height: 44px;
  line-height: 1.5;
  font-size: 14px;
  color: #ccc;
  background-color: rgba(0, 0, 0, 0.5);
  text-align: justify;
  z-index: 1000;
`

const CustomImageComponent = ({ src, useCDN, useCompress }: { src: string, useCDN: string, useCompress: string }) => {
  const useCDNFix = useCDN === 'true'
  const useCompressFix = useCompress === 'true'
  return (
    <LazyLoad height={200} offset={200} once>
      <PhotoView src={!useCDNFix ? src : CDN(src, false)} >
        <div style={{ maxHeight: 1000, overflow: 'auto' }}>
          <img
            className="ubb-tag-img"
            src={!useCDNFix ? (useCompressFix ? `${src}?compress=true&width=${IMG_COMPRESS_WIDTH}` : `${src}?compress=false`) : CDN(src, false)}
            onError={
              (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
                if (event.currentTarget.src === src) return
                event.currentTarget.src = src
              }
            }
          />
        </div>
      </PhotoView>
    </LazyLoad>
  )
}

const Markdown = (content: string) => {
  return <MarkdownView
    markdown={content}
    options={{ tables: true, emoji: true }}
    components={{ CustomImageComponent }}
  />
}

const TypographyS = muiStyled(Typography).attrs({
})({
  margin: '12px 16px',
  marginBottom: 0
})

interface Props {
  /**
   * 帖子信息
   */
  postInfo: IPost
}

export default ({ postInfo }: Props) => {
  const { useCompress, useCDN } = useModel(settingModel, ['useCompress', 'useCDN'])
  let regex_content = postInfo.content.trim()

  // FIXME: 可能还存在BUG
  const http_regex = /([^\]\[\)\(= ]|^)( *http[s]?\:\/\/?[a-zA-Z0-9\.\/\?\:@\-_=#]+\.*[a-zA-Z]{2,6}[a-zA-Z0-9\.\&\/\?\:@\-_=#%~]*)/g
  const image_regex = /.*\.(gif|jpe?g|bmp|png)$/ig
  regex_content = regex_content.replace(http_regex, (match: string, capture1: string, capture2: string) => {
    if (image_regex.test(capture2)) return match
    else {
      const url = capture2.trim()
      if (url.startsWith(window.location.origin)) {
        const inner_url = url.substring(window.location.origin.length)
        return postInfo.contentType === 0 ? `${capture1}[url=${url}]跳转到帖子(${inner_url})[/url]` : `${capture1}[跳转到帖子(${inner_url})](${url})`
      }
      else return postInfo.contentType === 0 ? `${capture1}[url=${url}]跳转到外链(${url})[/url]` : `${capture1}[跳转到外链(${url})](${url})`
    }
  })

  // markdown下的图片进行改造
  if (postInfo.contentType === 1) {
    const markdown_image_regex = /!\[.*?\]\((.*?)\)/g
    regex_content = regex_content.replace(markdown_image_regex, (match: string, capture: string) => {
      return `<CustomImageComponent src="${capture}" useCDN="${useCDN}" useCompress="${useCompress}" />`
    })
  }
  // 分享模式禁止跳转
  if (window.location.search.indexOf('code') !== -1) {
    const ubb_link_regex = /\[url.*?\].*?\[\/url\]/g
    // const markdown_link_regex = /(?<!!)\[.*?\]\(.*?\)/g
    const markdown_link_regex = /([^!]|^)\[.*?\]\(.*?\)/g
    if (postInfo.contentType === 0) regex_content = regex_content.replace(ubb_link_regex, '[url]分享模式禁止跳转[/url]')
    else regex_content = regex_content.replace(markdown_link_regex, `$1[分享模式禁止跳转](${window.location.href})`)
  }

  const content = postInfo.contentType === 0 ? UBBReact(regex_content) : Markdown(regex_content)

  // 每张图片的介绍
  const [intros, setIntros] = useState<{ [id: number]: string[] }>({})
  const [srcs, setSrcs] = useState<{ [id: number]: string }>({})
  return (
    <PhotoProvider
      overlayRender={({ rotate, onRotate, scale, index }) => {
        return (
          intros[index] &&
          <Overlay>
            {intros[index].map((value, index) => <div>{value}</div>)}
          </Overlay>
        );
      }}
      toolbarRender={({ images, rotate, onRotate, onScale, scale, index }) => {
        return (
          <>
            <HdrPlusIcon sx={{ margin: '0px 5px' }} onClick={() => {
              setIntros(prevIntros => {
                const newIntros = { ...prevIntros }
                newIntros[index] = ['图片增强中...']
                return newIntros
              })
              const src = srcs[index] || images[index].src
              src && getEnhancedImage(src).then(res =>
                res.fail().succeed(data => {
                  if (data.msg) {
                    setIntros(prevIntros => {
                      const newIntros = { ...prevIntros }
                      newIntros[index] = [data.msg ? data.msg : '']
                      return newIntros
                    })
                    return
                  }
                  const intro: string[] = ['图片增强完成']
                  images[index].src = data.url
                  setIntros(prevIntros => {
                    const newIntros = { ...prevIntros }
                    newIntros[index] = intro
                    return newIntros
                  })
                  setSrcs(prevSrcs => {
                    const newSrcs = { ...prevSrcs }
                    newSrcs[index] = src
                    return newSrcs
                  })
                })
              )
            }} />
            <FaceRetouchingNaturalIcon
             sx={{ margin: '0px 5px' }}
              onClick={() => {
                setIntros(prevIntros => {
                  const newIntros = { ...prevIntros }
                  newIntros[index] = ['人脸检测识别中...']
                  return newIntros
                })
                const src = srcs[index] || images[index].src
                src && getFaces(src).then(res =>
                  res.fail().succeed(data => {
                    if (data.msg) {
                      setIntros(prevIntros => {
                        const newIntros = { ...prevIntros }
                        newIntros[index] = [data.msg ? data.msg : '']
                        return newIntros
                      })
                      return
                    }
                    const faces = data.faces
                    const intro: string[] = []
                    intro.push(faces.length > 0 ? `检测到${faces.length}张人脸` : '未检测到人脸')
                    for (let i = 0; i < faces.length; i++) {
                      const face = faces[i]
                      intro.push(`[${i + 1}] 性别: ${face.gender <= 49 ? '女' : '男'} 年龄: ${face.age} 笑容: ${face.expression} 发型: ${face.hair} 魅力值: ${face.beauty}`)
                    }
                    if (faces.length > 0) images[index].src = data.url
                    setIntros(prevIntros => {
                      const newIntros = { ...prevIntros }
                      newIntros[index] = intro
                      return newIntros
                    })
                    setSrcs(prevSrcs => {
                      const newSrcs = { ...prevSrcs }
                      newSrcs[index] = src
                      return newSrcs
                    })
                  })
                )
              }}
            />
            <ZoomInIcon sx={{ margin: '0px 5px' }} onClick={() => onScale(scale + 0.2)} />
            <ZoomOutIcon sx={{ margin: '0px 5px' }} onClick={() => onScale(scale - 0.2)} />
            <RotateRightIcon sx={{ margin: '0px 5px' }} onClick={() => onRotate(rotate + 90)} />
          </>
        );
      }}
    >
      <TypographyS>{content}</TypographyS>
    </PhotoProvider>
  )
}
