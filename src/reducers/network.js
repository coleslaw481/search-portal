import { handleActions } from 'redux-actions'
import { CxToJs, CyNetworkUtils } from 'cytoscape-cx2js'

import * as vs from '../assets/data/styles.json'

import {
  networkFetchStarted,
  networkFetchFailed,
  networkFetchSucceeded,
  selectNode,
  selectEdge,
  deselectAll,
  setNetworkSize
} from '../actions/network'

const LAYOUT_SCALING_FACTOR = 2.0

const defaultState = {
  isFetching: false,
  uuid: '',
  jobId: '',
  sourceId: '',
  networkName: '',
  queryGenes: [],
  originalCX: null,
  network: null,
  nodeCount: 0,
  edgeCount: 0,
  isLayoutComplete: false,
  selectedNode: null,
  selectedEdge: null
}

const utils = new CyNetworkUtils()
const cx2js = new CxToJs(utils)

const PRESET_VS = vs.default[0].style

const SELECTION_COLOR = '#F2355B'

// Standard selection
PRESET_VS.push({
  selector: 'node:selected',
  css: {
    'background-color': 'red',
    color: '#FFFFFF',
    'background-opacity': 1,
    'border-width': 0,
    width: 100,
    height: 100
  }
})

// For class-based style update
const fadedNode = {
  selector: 'node.faded',
  css: {
    opacity: 0.2
  }
}

const fadedEdge = {
  selector: 'edge.faded',
  css: {
    opacity: 0.2
  }
}

const highlight = {
  selector: '.highlight',
  css: {
    opacity: 1.0
  }
}

const network = handleActions(
  {
    [networkFetchStarted]: (state, payload) => {
      console.log('Query start: genes = ', payload)
      return {
        ...state,
        isFetching: true,
        nodeCount: 0,
        edgeCount: 0,
        jobId: payload.payload.id,
        sourceId: payload.payload.sourceUUID,
        uuid: payload.payload.networkUUID,
        networkName: payload.payload.networkName,
        queryGenes: payload.payload.geneList,
        originalCX: null,
        network: null,
        isLayoutComplete: false,
        backgroundColor: 'blue'
      }
    },
    [networkFetchSucceeded]: (state, payload) => {
      const originalCX = payload.cx
      let network = {}
      try {
        const cyjsNetwork = convertCx2cyjs(originalCX, state.queryGenes)

        network = cyjsNetwork
      } catch (err) {
        // This is an error state
        console.warn('Could not convert given CX to CYJS:', err)
        throw new Error('Could not convert given CX to CYJS:', err)
      }

      const backgroundColor = getBackGround(originalCX)

      return {
        ...state,
        originalCX,
        network,
        backgroundColor,
        isFetching: false
      }
    },
    [networkFetchFailed]: (state, payload) => {
      return {
        ...state,
        network: null,
        originalCX: null,
        isFetching: false,
        nodeCount: 0,
        edgeCount: 0
      }
    },
    [setNetworkSize]: (state, payload) => {
      return {
        ...state,
        nodeCount: payload.payload.nodeCount,
        edgeCount: payload.payload.edgeCount
      }
    },
    [selectNode]: (state, payload) => {
      return { ...state, selectedNode: payload.payload, selectedEdge: null }
    },
    [selectEdge]: (state, payload) => {
      return { ...state, selectedNode: null, selectedEdge: payload.payload }
    },
    [deselectAll]: (state, payload) => {
      return { ...state, selectedNode: null, selectedEdge: null }
    }
  },
  defaultState
)

const convertCx2cyjs = (cx, queryGenes) => {
  const niceCX = utils.rawCXtoNiceCX(cx)
  const attributeNameMap = {}
  const elementsObj = cx2js.cyElementsFromNiceCX(niceCX, attributeNameMap)

  // This contains original style.
  const style = cx2js.cyStyleFromNiceCX(niceCX, attributeNameMap)

  const newStyle = styleUpdater(style)

  // const updatedStyle = styleUpdater(PRESET_VS, queryGenes)
  const updatedNodes = adjustLayout(elementsObj.nodes, queryGenes)
  const elements = [...updatedNodes, ...elementsObj.edges]
  return {
    elements,
    style: newStyle,
    isLayout: checkLayout(elementsObj.nodes)
  }
}

const VS_TAG = 'cyVisualProperties'
const getBackGround = cx => {
  let color = 'pink'

  const vps = cx.filter(entry => entry[VS_TAG])
  if (vps !== undefined && vps !== null && vps.length !== 0) {
    const vp = vps[0]
    const allVp = vp[VS_TAG]
    const networkVp = allVp.filter(p => p['properties_of'] === 'network')
    return networkVp[0].properties['NETWORK_BACKGROUND_PAINT']
  } else {
    return color
  }
}

// Utility function to get better results
const adjustLayout = (nodes, queryGenes) => {
  let len = nodes.length

  const upperQuery = new Set(queryGenes.map(gene => gene.toUpperCase()))

  while (len--) {
    const node = nodes[len]
    const position = node.position

    const name = node.data.name.toUpperCase()
    if (upperQuery.has(name)) {
      node.data['query'] = 'true'
    }

    if (position !== undefined) {
      node.position = {
        x: position.x * LAYOUT_SCALING_FACTOR,
        y: position.y * LAYOUT_SCALING_FACTOR
      }
    }
  }
  return nodes
}

const checkLayout = nodes => {
  // Just checks first node only!
  const node = nodes[0]
  if (node.position === undefined) {
    return false
  } else {
    return true
  }
}

const styleUpdater = style => {
  style.push(fadedNode)
  style.push(fadedEdge)
  style.push(highlight)
  // PRESET_VS.push({
  //   selector: 'node:selected',
  //   css: {
  //     'background-color': SELECTION_COLOR,
  //     width: ele => ele.width() * 1.3,
  //     height: ele => ele.height() * 1.3
  //   }
  // })
  //
  // PRESET_VS.push({
  //   selector: 'edge:selected',
  //   css: {
  //     'line-color': SELECTION_COLOR,
  //     'target-arrow-color': SELECTION_COLOR,
  //     opacity: 1.0,
  //     width: 6
  //   }
  // })
  //
  // PRESET_VS.push({
  //   selector: '.connected',
  //   css: {
  //     'background-color': SELECTION_COLOR,
  //     'background-opacity': 1.0
  //   }
  // })
  return style
}

export default network
