import LoadingCircle from '@/components/LoadingCircle'
import useFetcher from '@/hooks/useFetcher'
import useModel from '@/hooks/useModel'
import settingModel from '@/models/setting'
import { useQuery } from '@/router'
import { getHotPost, getPost, getPostSummary, getReversePost, getTracePost } from '@/services/post'
import {
  getTopicInfo
} from '@/services/topic'
import { navigateHandler } from '@/services/utils/errorHandler'
import { navigate } from '@/utils/history'
import React, { useState } from 'react'
import FixButtons from './FixButtons'
import PostHead from './PostHead'
import PostList, { PostPage } from './PostList'


interface Props {
  // 帖子 ID
  topicId: string
  // 追踪非匿名帖子
  userId?: string
  // 追踪匿名帖子
  postId?: string
  // 是否逆向
  isReverse?: boolean
  // 分享加密ID
  shareId?: string
  // 页码
  page?: string
}


const Topic = ({ topicId, userId, postId, isReverse, shareId, page }: Props) => {
  const { usePagination } = useModel(settingModel, ['usePagination'])
  if (topicId && !page && !userId && !postId && !isReverse && !shareId && usePagination) {
    navigate(`/topic/${topicId}/1`, { replace: true })
    return null
  }

  // 将shareId转化为 path+token的组合
  const safeATOB = (str: string) => {
    try {
      return window.atob(str)
    } catch {
      return '++'
    }
  }
  if (!!shareId) {
    const [sharePath, shareToken] = safeATOB(shareId).split('+')
    if (sharePath === '' || shareToken === '') {
      navigate('/error/410', { replace: true })
      return null
    }
    navigate(`${sharePath}?code=${shareToken}`, { replace: true })
    return null
  }
  if (!topicId) return null

  const query = useQuery()
  const shareToken = query.get('code')
  const isShare = shareToken !== null

  const [topicInfo, setTopicInfo] = useFetcher(isShare ? () => getTopicInfo(topicId, shareToken) : () => getTopicInfo(topicId), {
    fail: navigateHandler,
  })
  // 用于刷新
  const [postListKey, setPostListKey] = useState(0)

  if (!topicInfo) return <LoadingCircle />

  // 根据 URL 参数选择获取 post 的 service
  const postService = isReverse
    ? (from: number) => getReversePost(topicId, from, topicInfo.replyCount)
    : postId
      ? (from: number) => getTracePost(topicId, postId, from)
      :
      (from: number) => isShare ? getPost(topicId, from, shareToken) : getPost(topicId, from)

  const hotPostService = () => isShare ? getHotPost(topicId, shareToken) : getHotPost(topicId)

  const postSummaryService = () => isShare ? getPostSummary(topicId, shareToken) : getPostSummary(topicId)

  // 是否处于追踪状态
  const isTrace = !!userId || !!postId

  const refreshFunc = () => {
    getTopicInfo(topicId, isShare ? shareToken : undefined).then(res =>
      res.fail(navigateHandler).succeed(newTopicInfo => {
        setTopicInfo(newTopicInfo)
        setPostListKey(prevKey => prevKey + 1)
      })
    )
  }

  return (
    <>
      <PostHead
        topicInfo={topicInfo}
        refreshFunc={refreshFunc}
        isShare={isShare}
      />
      {
        page ?
          <PostPage
            key={postListKey}
            topicInfo={topicInfo}
            hotService={hotPostService}
            service={postService}
            summaryService={postSummaryService}
            page={parseInt(page)}
            isShare={isShare}
          />
          :
          <PostList
            key={postListKey}
            topicInfo={topicInfo}
            hotService={hotPostService}
            service={postService}
            summaryService={postSummaryService}
            isTrace={isTrace}
            isShare={isShare}
          />
      }
      <FixButtons
        topicInfo={topicInfo}
        isReverse={isReverse}
        isShare={isShare}
        refreshFunc={refreshFunc}
      />
    </>
  )
}

/**
 * 逆序 Topic
 */
const TopicReverse = (props: Props) => <Topic isReverse {...props} />

export { Topic as default, TopicReverse }
