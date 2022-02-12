import useFetcher from '@/hooks/useFetcher'
import userInstace from '@/models/user'
import { getBoardMastersById } from '@/services/board'
import { getShareToken } from '@/services/global'
import { FavoriteTopic, getTopicFavorite } from '@/services/topic'
import { favoriteHandler } from '@/services/utils/errorHandler'
import { judgeManagerOrBoardMasters } from '@/utils/ActionsJudge'
import { navigate } from '@/utils/history'
import snackbar from '@/utils/snackbar'
import { ITopic } from '@cc98/api'
import { IconButton, ListItemIcon, Menu, MenuItem, Typography } from '@material-ui/core'
import FavoriteIcon from '@material-ui/icons/Favorite'
import LinkIcon from '@material-ui/icons/Link'
import MoreVertIcon from '@material-ui/icons/MoreVert'
import SettingIcon from '@material-ui/icons/Settings'
import ShareIcon from '@material-ui/icons/Share'
import copy2Clipboard from 'copy-to-clipboard'
import React, { useEffect, useState } from 'react'
import Setting from './Dialog/Setting'


interface Props {
  /**
   * 帖子信息
   */
  topicInfo: ITopic
  refreshFunc: () => void
}

export default ({ topicInfo, refreshFunc }: Props) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [showSetting, setShowSetting] = useState(false)
  const [isFavorite, setIsFavorite] = useFetcher(() => getTopicFavorite(topicInfo.id))
  const [boardMasters, setBoardMasters] = useState<string[]>([])

  useEffect(() => {
    getBoardMastersById(topicInfo.boardId).then(res => setBoardMasters(res))
  }, [topicInfo.boardId])

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }
  const settingOpen = () => {
    setShowSetting(true)
  }
  const settingClose = () => {
    setShowSetting(false)
  }

  const handleShare2 = async () => {
    const res = await getShareToken(topicInfo.id, 'false')
    res
      .fail(err => {
        snackbar.success('分享链接获取失败')
        handleClose()
      })
      .succeed(res => {
        copy2Clipboard(`${res.long_url}`)
        snackbar.success(`分享链接已复制，有效期${Math.ceil(res.ex / 3600)}小时`)
        handleClose()
      })
  }

  const handleShare3 = async () => {
    const res = await getShareToken(topicInfo.id, 'true')
    res
      .fail(err => {
        snackbar.success('分享链接获取失败')
        handleClose()
      })
      .succeed(res => {
        copy2Clipboard(`${res.url}`)
        snackbar.success(`分享链接已复制，有效期${Math.ceil(res.ex / 3600)}小时`)
        handleClose()
      })
  }

  const handleShare1 = () => {
    if (document.location) {
      copy2Clipboard(`http://${document.location.host}/topic/${topicInfo.id}`)
    }
    snackbar.success('分享链接已复制')
    handleClose()
  }

  const handleFavorite = async () => {
    const res = await FavoriteTopic(topicInfo.id, isFavorite)
    res.fail(favoriteHandler).succeed(() => {
      isFavorite ? snackbar.success('取消收藏') : snackbar.success('收藏成功')
      setIsFavorite(!isFavorite)
    })
  }

  const handleSetting = () => {
    settingOpen()
    handleClose()
  }

  const myInfo = userInstace.state.myInfo
  const canManage = judgeManagerOrBoardMasters(myInfo, boardMasters)

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem
          onClick={() => {
            handleFavorite()
            handleClose()
          }}
        >
          <ListItemIcon>
            <FavoriteIcon color={isFavorite ? 'secondary' : 'disabled'} />
          </ListItemIcon>
          <Typography>{isFavorite ? '取消收藏' : '收藏主题'}</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => {
            window.open(`https://www.cc98.org/topic/${topicInfo.id}`)
            handleClose()
          }}
        >
          <ListItemIcon>
            <LinkIcon />
          </ListItemIcon>
          <Typography>官方页面</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleShare1()}>
          <ListItemIcon>
            <ShareIcon />
          </ListItemIcon>
          <Typography>普通分享</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleShare2()}>
          <ListItemIcon>
            <ShareIcon />
          </ListItemIcon>
          <Typography>免密分享</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleShare3()}>
          <ListItemIcon>
            <ShareIcon />
          </ListItemIcon>
          <Typography>免密短链分享</Typography>
        </MenuItem>
        {canManage && (
          <MenuItem onClick={() => handleSetting()}>
            <ListItemIcon>
              <SettingIcon />
            </ListItemIcon>
            <Typography>管理主题</Typography>
          </MenuItem>
        )}
      </Menu>
      {showSetting && (
        <Setting topicInfo={topicInfo} handleClose={settingClose} refreshFunc={refreshFunc} />
      )}
    </>
  )
}
