import { Box } from '@mui/material'
import { FieldViewItemProps } from 'components/atoms/fields/type'
import React from 'react'


function ViewNutritionHtmlAi(props: FieldViewItemProps) {
  const contentRef = React.useRef<HTMLDivElement>(null)

  const htmlContent = React.useMemo(() => {
    const rawHtml = String(props.post?.[props.name] ?? '')
    if (!rawHtml) return ''

    try {
      const doc = new DOMParser().parseFromString(rawHtml, 'text/html')

      doc.querySelectorAll('style').forEach((styleTag) => {
        styleTag.remove()
      })

      doc.querySelectorAll<HTMLElement>('*').forEach((element) => {
        element.style.cssText = ''
        element.removeAttribute('style')
      })

      doc.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((img) => {
        const dataSrc = img.getAttribute('data-src')
        if (dataSrc && (!img.getAttribute('src') || img.getAttribute('src')?.startsWith('data:image/gif'))) {
          img.setAttribute('src', dataSrc)
        }
      })

      return doc.body.innerHTML
    } catch (error) {
      return rawHtml
    }
  }, [props.name, props.post])

  React.useEffect(() => {
    if (!contentRef.current) return

    contentRef.current.querySelectorAll<HTMLElement>('*').forEach((element) => {
      element.style.cssText = ''
      element.removeAttribute('style')
    })
  }, [htmlContent])

  return (
    <Box>
      <div ref={contentRef} dangerouslySetInnerHTML={{ __html: htmlContent }} />
   
    </Box>
  )
}

export default ViewNutritionHtmlAi