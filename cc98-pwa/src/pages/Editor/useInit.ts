import { getOriginalPost } from '@/services/editor'
import { getSinglePost } from '@/services/post'
import { getTopicInfo } from '@/services/topic'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Props } from './index'


interface Init {
  /**
   * MetaInfo Model 初始值
   */
  metaInfo: {
    title: string
    type: number
    tag1?: number
    tag2?: number
  }
  /**
   * Editor Model 初始值
   */
  editor: {
    initContent: string
    initContentType: 0 | 1
  }
  /**
   * MetaInfo 的 props 之一
   * 同时 boardId 有值意味着是 发布/修改主题
   */
  boardId: number | undefined
}


/**
 * 获取 editor 和 metaInfo 的初始值，返回 null 意味着 loading 中
 */
export default function useInit(props: Props): Init | null {
  const { boardId, topicId, postId, floor } = props
  const [ok, setOk] = useState(false)

  const [initContent, setInitContent] = useState('')
  const [initContentType, setInitContentType] = useState<0|1>(0)
  const [isGetPost, setIsGetPost] = useState<boolean>(false)
  const [metaInfo, setMetaInfo] = useState<Init['metaInfo']>({
    title: '',
    type: 0,
  })
  const [retBoardId, setRetBoardId] = useState<number | undefined>(undefined)

  if (ok) {
    return {
      metaInfo,
      editor: {
        initContent,
        initContentType
      },
      boardId: retBoardId,
    }
  }

  // 发帖
  if (boardId && !topicId && !postId) {
    setRetBoardId(parseInt(boardId, 10))
    setOk(true)

    return null
  }

  // 引用某楼层
  if (topicId && floor && !isGetPost) {
    setIsGetPost(true)
    getSinglePost(topicId, parseInt(floor, 10)).then(res =>
      res.fail().succeed(postInfo => {
        const { floor, userName, time, topicId, content } = postInfo
        const formatTime = dayjs(time).format('YYYY-MM-DD HH:mm')
        setInitContent(
          `[quote][b]以下是引用${floor}楼：用户${userName}在${formatTime}的发言：[color=blue][url=/topic/${topicId}#${floor}]>>查看原帖<<[/url][/color][/b]\n${content}[/quote]\n`
        )
        setIsGetPost(false)
        setOk(true)
      })
    )

    return null
  }

  // 回复帖子
  if (topicId) {
    setOk(true)
    return null
  }

  // 编辑自己的帖子
  if (postId && !isGetPost) {
    setIsGetPost(true)
    getOriginalPost(postId).then(res =>
      res.fail().succeed(postInfo => {
        setInitContent(postInfo.content)
        setInitContentType(postInfo.contentType)
        if (postInfo.floor !== 1) {
          setOk(true)
          setIsGetPost(false)
          return
        }
        // 编辑主题
        setRetBoardId(postInfo.boardId)
        getTopicInfo(postInfo.topicId).then(res =>
          res.fail().succeed(topicInfo => {
            setMetaInfo({
              title: topicInfo.title,
              type: topicInfo.type,
              tag1: topicInfo.tag1,
              tag2: topicInfo.tag2,
            })
            setOk(true)
            setIsGetPost(false)
          })
        )
      })
    )

    return null
  }

  return null
}
