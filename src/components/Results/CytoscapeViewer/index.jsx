import React, { useEffect, useState } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'

import './style.css'
import Warning from './Warning'
let cyInstance = null

const PRESET_LAYOUT = {
  name: 'preset',
  padding: 6
}

const COCENTRIC_LAYOUT = {
  name: 'concentric',
  padding: 6,
  minNodeSpacing: 100
}

const COSE_SETTING = {
  name: 'cose',
  padding: 6,
  nodeRepulsion: function(node) {
    return 10080000
  },
  nodeOverlap: 400000,
  idealEdgeLength: function(edge) {
    return 10
  }
}

/**
 *
 * Simple wrapper for cytoscape.js react component
 *
 * @param props
 * @returns {*}
 * @constructor
 */
const CytoscapeViewer = props => {
  const { highlights } = props.uiState

  useEffect(() => {
    if (cyInstance === undefined || cyInstance === null) {
      return
    }
    console.log('This should run only once:  CyViewer Mounted:', cyInstance)

    cyInstance.on('tap', function(event) {
      try {
        cyInstance.nodes().removeClass('connected')
        const target = event.target
        if (target === cyInstance) {
          props.networkActions.deselectAll()
          console.log('UNSELECT')
        }
      } catch (e) {
        console.warn(e)
      }
    })

    cyInstance.on('tap', 'node', function() {
      try {
        cyInstance.nodes().removeClass('connected')
        const selected = this.data()
        props.networkActions.selectNode(selected)
      } catch (e) {
        console.warn(e)
      }
    })

    cyInstance.on('tap', 'edge', function() {
      try {
        cyInstance.nodes().removeClass('connected')
        const selected = this.data()
        const { source, target } = selected

        cyInstance.$('#' + source + ', #' + target).addClass('connected')

        props.networkActions.selectEdge(selected)
      } catch (e) {
        console.warn(e)
      }
    })

    return () => {
      console.log('unmount')
    }
  }, [])

  const numObjects = props.network.nodeCount + props.network.edgeCount
  if (numObjects > 5000) {
    return <Warning />
  }

  const cyjs = props.network.network
  if (cyjs === null || cyjs === undefined) {
    return null
  }

  const networkAreaStyle = {
    width: '100%',
    height: '100%',
    background: props.network.backgroundColor
  }

  const isLayoutAvailable = cyjs.isLayout

  let layout = PRESET_LAYOUT
  if (!isLayoutAvailable && cyjs.elements.length < 500) {
    layout = COSE_SETTING
  } else if (!isLayoutAvailable) {
    layout = COCENTRIC_LAYOUT
  }

  if (cyInstance !== null) {
    cyInstance.resize()

    if (highlights) {
      cyInstance.elements().addClass('faded')
      const query = cyInstance.filter('node[querynode = "true"]')
      query.addClass('highlight')
    } else {
      cyInstance.elements().removeClass('faded')
    }
  }

  return (
    <CytoscapeComponent
      elements={cyjs.elements}
      layout={layout}
      style={networkAreaStyle}
      stylesheet={cyjs.style}
      cy={cy => (cyInstance = cy)}
    />
  )
}

export default CytoscapeViewer
