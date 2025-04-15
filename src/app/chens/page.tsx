'use client'
import { Box, Button, ButtonGroup, FormControl, IconButton, InputLabel, Popover, Select, SpeedDial, SpeedDialAction, Stack, TextField, Tooltip, Typography } from '@mui/material';
import * as MUI from '@mui/material';
import { dia, shapes, elementTools, linkTools } from '@joint/core';
import { Menu, MenuItem } from "@spaceymonk/react-radial-menu";
import * as joint from '@joint/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import SaveIcon from "@mui/icons-material/Save";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import FileUploadIcon from "@mui/icons-material/FileUpload";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import DescriptionIcon from '@mui/icons-material/Description';
import CircleIcon from '@mui/icons-material/Circle';
import RectangleIcon from '@mui/icons-material/Rectangle';
import HexagonIcon from '@mui/icons-material/Hexagon';
import ShapeLineIcon from '@mui/icons-material/ShapeLine';
import React from "react";

import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

type ChenOptions = "attribute" | "entity" | "relationship"

export default function Home() {
  const [paper, setPaper] = useState<dia.Paper>()
  const graphRef = useRef<dia.Graph>(null)
  const [selectedElement, _setSelectedElement] = useState<dia.Element>()
  const selectedElementRef = useRef<dia.Element>(undefined)
  const [connectedElements, setConnectedElements] = useState<dia.Element[]>([])
  const [elementConfigurationUI, setElementConfigurationUI] = useState<React.JSX.Element>(<></>);
  const [panningEnabled, setPanningEnabled] = useState<boolean>(true)
  const [selectionManager, setSelectionManager] = useState<SelectionManager>();
  const [shouldShowSelectionWheel, setShowSelectionWheel] = React.useState(false);
  const [positionSelectionWheel, setPositionSelectionWheel] = React.useState({ x: 0, y: 0 });
  const [helpAnchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const isHelpOpen = Boolean(helpAnchorEl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shiftHeld = useRef<boolean>(false)
  const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null)
  const boxWrapperRef = useRef<HTMLElement>(null)
  const width = 8000 // in pixels
  const height = 8000 // in pixels
  const elementWidth = 150 // in pixels
  const elementHeight = 80 // in pixels
  const colors = [
    {
      name: 'Blue',
      value: '#AEC6CF' // Pastel Blue
    },
    {
      name: 'Orange',
      value: '#FFDAB9' // Pastel Orange (Peach Puff)
    },
    {
      name: 'Yellow',
      value: '#FFFFE0' // Light Pastel Yellow (Light Yellow)
    },
    {
      name: 'Green',
      value: '#B0E57C' // Pastel Green
    },
    {
      name: 'Red',
      value: '#FFB6C1' // Light Pink / Pastel Red
    },
    {
      name: 'White',
      value: '#FFFFFF' // White
    },
    {
      name: 'Grey',
      value: '#D3D3D3' // Light Grey
    },
  ]

  function setSelectedElement(element: dia.Element | undefined) {
    selectedElementRef.current = element
    refreshNeighbors()
    _setSelectedElement(element)
  }

  const handleHelpClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleHelpClose = () => {
    setAnchorEl(null);
  };


  const onImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click(); // Opens file dialog
    }
  };

  const refreshNeighbors = () => {
    if (selectedElementRef.current) {
      var elements = graphRef.current?.getNeighbors(selectedElementRef.current)
      if (elements) {
        setConnectedElements(elements)
      }
    } else {
      setConnectedElements([])
    }
  }

  useEffect(() => {
    refreshNeighbors()
  }, [])

  useEffect(() => {

    // Listen for the keydown event to check if Shift is pressed
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Shift') {
        shiftHeld.current = true
      }
    });

    // Listen for the keyup event to check if Shift is released
    document.addEventListener('keyup', (event) => {
      if (event.key === 'Shift') {
        shiftHeld.current = false
      }
    });
  }, [])

  class SelectionManager {
    private selected: Set<joint.dia.Element> = new Set();
    private isSelectionDragging = false;
    private isElementDragging = false;
    private initialPositions: Map<joint.dia.Cell.ID, { x: number; y: number }> = new Map();

    constructor(private paper: joint.dia.Paper, private graph: joint.dia.Graph) {
      this.initEvents();
    }

    private initEvents() {
      // Rubberband selection start
      this.paper.on('blank:pointerdown', (event, x, y) => this.startSelectionDragging(event, x, y));

      // Rubberband selection end
      this.paper.on('blank:pointerup', () => this.stopSelectionDragging());

      // Element drag start (only after selection dragging is done)
      this.paper.on('element:pointerdown', (elementView, event) => this.startElementDragging(elementView, event));

      // Element drag move (only moves after selection)
      this.paper.on('element:pointermove', (elementView, _, x, y) => this.dragElements(elementView, x, y));

      // Element drag stop
      this.paper.on('element:pointerup', () => this.stopElementDragging());
    }

    private startSelectionDragging(event: dia.Event, x: number, y: number) {
      if ((event.originalEvent as MouseEvent).button != 0) {
        return
      }
      this.isSelectionDragging = true;

      // Clear previous selection
      this.clearSelection();

      // Create a temporary selection box
      const selectionBox = new joint.shapes.standard.Rectangle();
      selectionBox.position(x, y);
      selectionBox.resize(1, 1);
      selectionBox.id = "selectionBBOXElement"
      selectionBox.attr({ body: { fill: 'rgba(0, 0, 255, 0.1)', stroke: 'blue', 'stroke-dasharray': '5,5' } });
      selectionBox.addTo(this.graph);

      // Update the box size on mouse move
      this.paper.on('blank:pointermove', (_, newX, newY) => {
        const width = Math.abs(newX - x);
        const height = Math.abs(newY - y);

        const newXPos = Math.min(x, newX);
        const newYPos = Math.min(y, newY);

        selectionBox.resize(width, height);
        selectionBox.position(newXPos, newYPos);
      });

      // On mouse up, select elements inside the box
      this.paper.once('blank:pointerup', () => {
        const bbox = selectionBox.getBBox();
        this.graph.getElements().forEach((el) => {
          if (bbox.containsRect(el.getBBox()) && el.id != "selectionBBOXElement") {
            this.addElement(el);
          }
        });

        if (this.selected.size == 1) {
          setSelectedElement(this.selected.values().next().value)
        }
        selectionBox.remove();
        this.isSelectionDragging = false; // Enable dragging after selection
      });
    }

    private stopSelectionDragging() {
      this.isSelectionDragging = false;
    }

    private startElementDragging(elementView: joint.dia.ElementView, _: joint.dia.Event) {
      if (this.isSelectionDragging) return; // Prevent dragging while selecting

      const element = elementView.model;
      this.isElementDragging = true;

      if (!this.selected.has(element)) {
        this.clearSelection();
        if (this.selected.size == 0) {
          setSelectedElement(element)
        } else {
          setSelectedElement(undefined)
        }
        this.addElement(element);
      }

      // Store initial positions
      this.initialPositions.clear();
      this.selected.forEach((el) => {
        this.initialPositions.set(el.id, el.position());
      });
    }

    private dragElements(elementView: joint.dia.ElementView, x: number, y: number) {
      if (!this.isElementDragging) return;

      const draggedElement = elementView.model;
      if (!this.selected.has(draggedElement)) return;

      const initialPosition = this.initialPositions.get(draggedElement.id);
      if (!initialPosition) return;

      // Offset drag by element width and height
      const dx = x - initialPosition.x - elementWidth / 2; // Offset by half the width
      const dy = y - initialPosition.y - elementHeight / 2; // Offset by half the height

      // Move all selected elements
      this.selected.forEach((el) => {
        const pos = this.initialPositions.get(el.id);
        if (pos) {
          el.position(pos.x + dx, pos.y + dy);
        }
      });
    }

    private stopElementDragging() {
      this.isElementDragging = false;
    }

    addElement(element: joint.dia.Element) {
      this.selected.add(element);
      element.attr('body/stroke', 'blue'); // Highlight selection
    }

    clearSelection() {
      if (!shiftHeld.current) {
        this.selected.forEach((el) => el.attr('body/stroke', 'black'));
        this.selected.clear();
        setSelectedElement(undefined)
      }
    }

    getSelectedElements() {
      return Array.from(this.selected);
    }
  }

  const optionalSingleLine = new shapes.standard.DoubleLink(
    {
      z: 0,
      attrs: {
        line: {
          stroke: 'black',    // Black line color
          strokeWidth: 4,     // Line thickness
          strokeLinejoin: 'round',
          strokeLinecap: 'round',
          strokeDasharray: '10 10',  // Dashed pattern: 10px dash, 5px gap
          targetMarker: { type: 'none' },   // No arrowhead at target
          sourceMarker: { type: 'none' }    // No arrowhead at source
        },
        outline: {
          stroke: 'transparent',
          strokeWidth: 10,
        },
        custom: {
          type: 'optional'
        }
      },
      connector: {
        name: 'rounded'
      }
    }
  );


  const singleLine = new shapes.standard.DoubleLink(
    {
      z: 0,
      attrs: {
        line: {
          stroke: 'black',    // Black line color
          strokeWidth: 4,     // Line thickness
          strokeLinejoin: 'round',
          strokeLinecap: 'round',
          strokeDasharray: 'none',
          targetMarker: { type: 'none' },   // No arrowhead at target
          sourceMarker: { type: 'none' }    // No arrowhead at source
        },
        outline: {
          stroke: 'transparent',
          strokeWidth: 10,
        },
        custom: {
          type: 'partial'
        }
      },
      connector: {
        name: 'rounded'
      }
    }
  );
  // This will be the double line used in chens
  const doubleLine = new shapes.standard.DoubleLink(
    {
      z: 0,
      attrs: {
        line: {
          stroke: 'white',      // Main line color (white)
          strokeWidth: 2,       // Thickness of the main line
          fill: 'none',
          strokeDasharray: 'none',
          targetMarker: { type: 'none' },     // Removes arrowhead at target
          sourceMarker: { type: 'none' }
        },
        outline: {
          stroke: 'black',      // Outline color (black)
          strokeWidth: 10,       // Thickness of the outline (should be greater than strokeWidth)
        },
        custom: {
          type: 'total'
        }

      },
      connector: {
        name: 'rounded'
      }
    }
  )

  //Note, the creation of the paper must be inside the useEffect to allow the div with id "paper" to exist before its initialization
  useEffect(() => {
    // create paper
    const namespace = {
      ...shapes,
      morphable: { Standard: MorphableShape }
    }

    const graph = new dia.Graph({}, { cellNamespace: namespace });
    graphRef.current = graph

    const paper = new dia.Paper({
      el: document.getElementById('joinjs_graph'),
      model: graph,
      width: width,
      height: height,
      gridSize: 10,
      drawGrid: {
        color: '#c9c9c9',
        thickness: 1,
        name: 'mesh',
      },
      linkPinning: false,
      interactive: { linkMove: false },
      snapLinks: { radius: 10 },
      defaultLink: singleLine,
      linkLayer: 0,
      defaultConnectionPoint: {
        name: 'boundary',
        args: {
          sticky: true,
          perpendicular: true
        }
      },
      validateConnection: (
        sourceView,
        sourceMagnet,
        targetView,
        targetMagnet,
        end
      ) => {
        const source = sourceView.model;
        const target = targetView.model;
        if (source.isLink() || target.isLink()) return false;
        if (targetMagnet === sourceMagnet) return false;
        if (source === target) return false;

        if (end === 'target' ? targetMagnet : sourceMagnet) {
          return true;
        }

        // If there is already a link between the two cells, then don't add another link
        if (getLinkBetweenById(source.id as string, target.id as string)) {
          return false
        }

        if (end === 'target' ? target.isElement() && !target.hasPorts() : source.isElement() && !source.hasPorts()) {
          const sAttr = source.attr()
          const tAttr = target.attr()

          //Attributes can connection to attributes only if it is composite and visa versa
          if (sAttr.elementType == 'attribute' && tAttr.elementType == 'attribute' && (sAttr.elementSubType == 'composite' || tAttr.elementSubType == 'composite')) {
            return true
          }

          //Attributes can connection to entities and visa versa
          if ((sAttr.elementType == 'attribute' && tAttr.elementType == 'entity') ||
            (tAttr.elementType == 'attribute' && sAttr.elementType == 'entity')) {
            return true
          }

          //Entities can connect to relationships and visa versa
          if ((sAttr.elementType == 'relationship' && tAttr.elementType == 'entity') ||
            (tAttr.elementType == 'relationship' && sAttr.elementType == 'entity')) {
            return true
          }
        }

        return false
      },
      background: { color: '#F5F5F5' },
      cellViewNamespace: namespace
    })

    setSelectionManager(new SelectionManager(paper, graph))

    const boundaryTool = new linkTools.Boundary();
    const removeButton = new linkTools.Remove();

    const toolsView = new dia.ToolsView({ tools: [boundaryTool, removeButton] });

    paper.on('link:mouseenter', function(linkView) {
      linkView.addTools(toolsView);
    });

    paper.on('link:mouseleave', (linkView) => {
      linkView.removeTools();
    });

    paper.on('element:mouseenter', elementView => {
      elementView.showTools();
    });

    paper.on('element:mouseleave', elementView => {
      elementView.hideTools();
    });

    paper.on('link:connect', (_) => {
      refreshNeighbors()
    })

    graph.on('remove', (cell: dia.Cell) => {
      fixSelectedElement(cell)
      refreshNeighbors()
    })

    setPaper(paper)
  }, [])

  const fixSelectedElement = (element: dia.Cell) => {
    if (element.cid == selectedElementRef.current?.cid) {
      setSelectedElement(undefined)
    }
  }

  function isInput(event: KeyboardEvent) {

    if (event.target && typeof (event.target as any).className == "string") {
      if (((event.target as any)?.className as string).indexOf("MuiInputBase") == -1) {
        return false
      }
    }

    return true
  }

  // Handle delete and backspace key events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace' && !isInput(event)) {
      if (selectionManager) {
        graphRef.current?.removeCells(selectionManager?.getSelectedElements())
        selectionManager?.clearSelection()
      }
    }

    if (event.key == 'Escape') {
      selectionManager?.clearSelection()
    }
  }, [selectionManager, graphRef.current]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup listener on component unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const addElement = (name: ChenOptions, shape: dia.Element, useWheel: boolean, xPos?: number, yPos?: number, label?: string, elementNum: number = 0) => {
    if (graphRef.current && paper) {
      //shape.addTo(graph);
      var x = (useWheel ? positionSelectionWheel.x : (boxWrapperRef.current?.offsetWidth || 0) / 2) - (transformWrapperRef.current?.instance.transformState.positionX || 0)
      var y = (useWheel ? positionSelectionWheel.y : (boxWrapperRef.current?.offsetHeight || 0) / 2) - (transformWrapperRef.current?.instance.transformState.positionY || 0) - elementHeight / 2 - 36.5 // To note, the 36.5 is the height of the header

      if (xPos) {
        x = xPos + elementWidth / 2
      }

      if (yPos) {
        y = yPos + elementHeight / 2
      }

      switch (name) {
        case 'relationship': {
          morphShape(shape, diamondMarkup, diamondAttrs)
          break
        }
        case 'entity': {
          morphShape(shape, rectangleMarkup, rectangleAttrs)
          break
        }
        case 'attribute': {
          morphShape(shape, ellipseMarkup, ellipseAttrs)
          break
        }
      }

      shape.position(x - elementWidth / 2, y - elementHeight / 2);
      shape.resize(elementWidth, elementHeight);
      shape.attr('label', { text: label ? label : name });
      shape.attr('elementType', name)
      shape.attr('elementSubType', 'regular')
      shape.attr('elementNum', elementNum)
      // Define ports separately

      // 1) Create element tools
      const boundaryTool = new elementTools.Boundary();
      const removeButton = new elementTools.Remove({
        useModelGeometry: true,
        x: '10%',
        y: '50%',
      });
      const connectTool = new elementTools.Connect({
        useModelGeometry: true,
        x: '90%',
        y: '50%',
      })

      // 2) Create tools view
      const toolsView = new dia.ToolsView({
        name: 'basic-tools',
        tools: [boundaryTool, removeButton, connectTool]
      });

      shape.addTo(graphRef.current)
      // 3) Attach the tools to the original shape's view
      const shapeView = shape.findView(paper);
      shapeView.addTools(toolsView);
      shapeView.hideTools(); // Hide the tools

      return shape
    }

    return undefined
  }


  function onSave() {
    // Convert JSON object to string
    if (!graphRef.current) {
      return;
    }

    const jsonString = JSON.stringify(graphRef.current.toJSON(), null, 2)

    // Create a Blob with JSON data
    const blob = new Blob([jsonString], { type: "application/json" });

    // Create a downloadable URL
    const url = URL.createObjectURL(blob);

    // Create an anchor element and trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.json"; // File name
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Release the object URL
    URL.revokeObjectURL(url);
  }


  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; // Get the first file

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string; // Read file content
        const json = JSON.parse(text); // Parse JSON
        if (graphRef.current) {
          graphRef.current.fromJSON(json)
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    };


    reader.readAsText(file); // Read file as text
  };

  const handleExportSVG = () => {
    const svgRoot = paper.svg; // Full SVG DOM
    console.log(svgRoot);
    if (!svgRoot) {
      console.error('SVG root not found');
      return;
    }

    // Grab the <g class="joint-cells-layer joint-viewport"> element
    const gLayer = svgRoot.querySelector('g.joint-cells-layer.joint-viewport');
    if (!gLayer) {
      console.error('Viewport layer not found');
      return;
    }

    console.log(gLayer);

    // Clone the relevant <g> tag
    const gClone = gLayer.cloneNode(true) as SVGGElement;

    gClone.querySelectorAll('[fill="#f36"], [fill="#ff4060"], .selection-box, .highlighted-element')
        .forEach(el => el.remove());

    // Optional: get bounding box to fit viewBox to content
    const bbox = gLayer.getBBox();

    // Create a new standalone SVG element
    const standaloneSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    standaloneSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    standaloneSvg.setAttribute('width', `${bbox.width}`);
    standaloneSvg.setAttribute('height', `${bbox.height}`);
    standaloneSvg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    const defs = svgRoot.querySelector('defs');
    if (defs) {
      const defsClone = defs.cloneNode(true);
      standaloneSvg.appendChild(defsClone);
    }
    standaloneSvg.appendChild(gClone);

    // Serialize and download
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(standaloneSvg);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram-layer.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const MorphableShape = dia.Element.define('morphable.Standard', {
    size: { width: 100, height: 60 },
    attrs: {
      body: {
        fill: '#FFFFFF',
        stroke: '#000000'
      },
      label: {
        text: 'Label',
        refX: '50%',
        refY: '50%',
        textAnchor: 'middle',
        yAlignment: 'middle',
        fontSize: 14
      }
    }
  }, {
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'text', selector: 'label' }
    ]
  });

  function morphShape(
    element: dia.Element,
    newMarkup: dia.MarkupNodeJSON[],
    newAttrs: dia.Element.Attributes['attrs']
  ) {
    const currentAttrs = element.attr();

    // Get preserved values
    const currentFill = currentAttrs?.body?.fill || '#FFFFFF';
    const currentStroke = currentAttrs?.body?.stroke || '#000000';
    const currentLabelText = currentAttrs?.label?.text || 'Label';

    const currentElementType = currentAttrs?.elementType;
    const currentElementSubType = currentAttrs?.elementSubType;
    const currentElementNum = currentAttrs?.elementNum;

    // Deep clone to avoid mutation
    const mergedAttrs = JSON.parse(JSON.stringify(newAttrs));

    // Restore style
    if (mergedAttrs.body) {
      mergedAttrs.body.fill = currentFill;
      mergedAttrs.body.stroke = currentStroke;
    }

    // Restore label
    if (mergedAttrs.label) {
      mergedAttrs.label.text = currentLabelText;
    }

    // Restore custom attributes
    if (currentElementType !== undefined) {
      mergedAttrs.elementType = currentElementType;
    }

    if (currentElementSubType !== undefined) {
      mergedAttrs.elementSubType = currentElementSubType;
    }

    if (currentElementNum !== undefined) {
      mergedAttrs.elementNum = currentElementNum;
    }

    // Apply morph
    element.set('markup', newMarkup);
    element.set('attrs', mergedAttrs);
  }

  const weakEntityMarkup = [
    { tagName: 'rect', selector: 'body' }, // "body" is the outer rectangle, for compatibility
    { tagName: 'rect', selector: 'inner' },
    { tagName: 'text', selector: 'label' }
  ];

  const weakEntityAttrs = {
    inner: {
      width: elementWidth - 10,
      height: elementHeight - 10,
      ref: 'root',
      refX: '5',
      refY: '5',
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 2
    },
    body: {
      width: elementWidth,
      height: elementHeight,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 2
    },
    label: {
      text: 'WeakEntity',
      refX: '50%',
      refY: '50%',
      textAnchor: 'middle',
      yAlignment: 'middle',
      fontSize: 14,
      style: { whiteSpace: 'pre-wrap' },
      textWrap: {
        width: '90%',
        height: '90%',
        ellipsis: true
      }
    }
  };

  const associativeEntityMarkup = [
    { tagName: 'rect', selector: 'body' },
    { tagName: 'path', selector: 'path' },
    { tagName: 'text', selector: 'label' }
  ];

  const associativeEntityAttrs = {
    body: {
      width: elementWidth,
      height: elementHeight,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 2,
    },
    path: {
      //refX: '5%',
      //refY: '5%',
      d: `M${elementWidth / 2},1 L${elementWidth - 3},${elementHeight / 2} L${elementWidth / 2},${elementHeight - 1} L3,${elementHeight / 2} Z`,  // Path representing a diamond shape
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 2
    },
    label: {
      text: 'AssocEntity',
      refX: '50%',
      refY: '50%',
      textAnchor: 'middle',
      yAlignment: 'middle',
      fontSize: 14,
      style: { whiteSpace: 'pre-wrap' },
      textWrap: {
        width: '60%',
        height: '60%',
        ellipsis: true
      }
    }
  };

  const rectangleMarkup = [
    { tagName: 'rect', selector: 'body' },
    { tagName: 'text', selector: 'label' }
  ];

  const rectangleAttrs = {
    body: {
      width: elementWidth,
      height: elementHeight,
      fill: '#FFFFFF',
      strokeWidth: 2,
      stroke: '#000000'
    },
    label: {
      text: 'Rectangle',
      refX: '50%',
      refY: '50%',
      textAnchor: 'middle',
      yAlignment: 'middle',
      fontSize: 14,
      style: { whiteSpace: 'pre-wrap' },
      textWrap: {
        width: '90%',
        height: '90%',
        ellipsis: true
      }
    }
  };

  const diamondMarkup = [
    { tagName: 'polygon', selector: 'body' },
    { tagName: 'text', selector: 'label' }
  ];

  const diamondAttrs = {
    body: {
      refPoints: '50,5 95,30 50,55 5,30',  // Polygon points forming the diamond
      fill: '#FFFFFF',
      strokeWidth: 2,
      stroke: '#000000'
    },
    label: {
      text: 'Diamond',
      refX: '50%',
      refY: '50%',
      textAnchor: 'middle',
      yAlignment: 'middle',
      fontSize: 14,
      style: { whiteSpace: 'pre-wrap' },
      textWrap: {
        width: '60%',
        height: '60%',
        ellipsis: true
      }
    }
  };

  const weakRelationshipMarkup = [
    { tagName: 'polygon', selector: 'body' },  // Outer diamond
    { tagName: 'path', selector: 'path' }, // Inner diamond
    { tagName: 'text', selector: 'label' }
  ];

  const weakRelationshipAttrs = {
    body: {
      refPoints: '50,5 95,30 50,55 5,30',  // Outer diamond points
      fill: '#FFFFFF',
      strokeWidth: 2,
      stroke: '#000000'
    },
    path: {
      d: `M${elementWidth / 2},5 L${elementWidth - 10},${elementHeight / 2} L${elementWidth / 2},${elementHeight - 5} L10,${elementHeight / 2} Z`,  // Path representing a diamond shape
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 2
    },
    label: {
      text: 'Weak Relationship',
      refX: '50%',
      refY: '50%',
      textAnchor: 'middle',
      yAlignment: 'middle',
      fontSize: 14,
      style: { whiteSpace: 'pre-wrap' },
      textWrap: {
        width: '60%',
        height: '60%',
        ellipsis: true
      }
    }
  };

  const ellipseMarkup = [
    { tagName: 'ellipse', selector: 'body' },
    { tagName: 'text', selector: 'label' }
  ];

  const ellipseAttrs = {
    body: {
      rx: elementWidth / 2,     // Horizontal radius
      ry: elementHeight / 2,    // Vertical radius
      cx: elementWidth / 2,
      cy: elementHeight / 2,
      fill: '#FFFFFF',
      strokeWidth: 2,
      stroke: '#000000',
      strokeDasharray: 'none'
    },
    label: {
      text: 'Ellipse',
      refX: '50%',
      refY: '50%',
      textAnchor: 'middle',
      yAlignment: 'middle',
      fontSize: 14,
      style: { whiteSpace: 'pre-wrap' },
      textWrap: {
        width: '70%',
        height: '70%',
        ellipsis: true
      },
      textDecoration: 'none'
    }
  };

  const keyAttributeMarkup = ellipseMarkup;

  const keyAttributeAttrs = {
    ...ellipseAttrs,
    label: {
      ...ellipseAttrs.label,
      textDecoration: 'underline'
    }
  };

  const partialKeyAttributeMarkup = [
    { tagName: 'ellipse', selector: 'body' },
    { tagName: 'text', selector: 'label' },
    { tagName: 'line', selector: 'underline' }
  ];

  const partialKeyAttributeAttrs = {
    ...ellipseAttrs,
    underline: {
      ref: 'label',
      refX: '0%',
      refY: '100%',
      stroke: '#000000',
      strokeDasharray: '4,3',
      strokeWidth: 1,
      x2: 'calc(w)'
    }
  };

  const multivaluedAttributeMarkup = [
    { tagName: 'ellipse', selector: 'body' },
    { tagName: 'ellipse', selector: 'inner' },
    { tagName: 'text', selector: 'label' }
  ];

  const multivaluedAttributeAttrs = {
    inner: {
      rx: elementWidth / 2 - 5,
      ry: elementHeight / 2 - 5,
      cx: elementWidth / 2,
      cy: elementHeight / 2,
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 2
    },
    ...ellipseAttrs,
  };

  const derivedAttributeMarkup = ellipseMarkup

  const derivedAttributeAttrs = {
    ...ellipseAttrs,
    body: {
      ...ellipseAttrs.body,
      strokeDasharray: '5,5'
    }
  };

  function handleSelection(option: ChenOptions, useWheel: boolean = false) {
    switch (option) {
      case "attribute":
        addElement('attribute', new MorphableShape(), useWheel)
        break;
      case "entity":
        addElement('entity', new MorphableShape(), useWheel)
        break;
      case "relationship":
        addElement('relationship', new MorphableShape(), useWheel)
        break;
    }

  }

  const handleItemClick = (item: string) => {
    setShowSelectionWheel(false)
    handleSelection(item as ChenOptions, true)
  };

  const menuItems: { label: string, data: ChenOptions }[] = [
    {
      label: "Attribute",
      data: "attribute",
    },
    {
      label: "Relationship",
      data: "relationship",
    },
    {
      label: "Entity",
      data: "entity",
    }
  ]

  useEffect(() => {
    if (selectedElement) {
      setElementConfigurationUI(getElementConfigurationUI(selectedElement))
    } else {
      setElementConfigurationUI(<></>)
    }
  }, [selectedElement, connectedElements])

  function getElementConfigurationUI(element: dia.Element) {

    switch (element.attr().elementType) {
      case "attribute":
        return getAttributeConfigUI(element)
      case "entity":
        return getEntityConfigUI(element)
      case "relationship":
        return getRelationshipConfigUI(element)
      default:
        return <></>
    }
  }

  function getConfigUILayout(label: string, children: React.JSX.Element) {
    return (
      <Stack key={Math.random()} sx={{ width: 1, height: 'auto', pt: 1 }} alignItems="center" direction="column" spacing={3}>
        <MUI.Paper elevation={5} sx={{ textAlign: 'center', width: 0.8, p: 2 }}>
          <Typography variant="h3">{label}</Typography>
        </MUI.Paper>
        <Box sx={{ width: 1, height: 1, display: 'inline-block' }}>
          <Stack sx={{ width: 'auto', height: 'auto', p: 1 }} alignItems="center" direction="column" spacing={1}>
            {children}
          </Stack>
        </Box>
      </Stack>
    )
  }

  function getAttributeConfigUI(element: dia.Element) {

    var attributes = element.attr()

    var color = attributes?.body?.fill
    var subType = attributes?.elementSubType
    var text = attributes?.label?.text

    function changeSubType(val: string) {
      element.prop('attrs/elementSubType', val)
      switch (val) {
        case 'key': {
          morphShape(element, keyAttributeMarkup, keyAttributeAttrs)
          removeAllSubAttributes()
          break
        }
        case 'partial_key': {
          morphShape(element, partialKeyAttributeMarkup, partialKeyAttributeAttrs)
          removeAllSubAttributes()
          break
        }
        case 'derived': {
          morphShape(element, derivedAttributeMarkup, derivedAttributeAttrs)
          removeAllSubAttributes()
          break
        }
        case 'multivalued': {
          morphShape(element, multivaluedAttributeMarkup, multivaluedAttributeAttrs)
          removeAllSubAttributes()
          break
        }
        case 'regular': {
          morphShape(element, ellipseMarkup, ellipseAttrs)
          removeAllSubAttributes()
          break
        }
        case 'composite': {
          morphShape(element, ellipseMarkup, ellipseAttrs)
          addConnectedElementBelow(element, `Sub-Attribute ${connectedElements.length}`, (attributes.elementNum + 1) % 3)
          break
        }
      }
    }

    function removeAllSubAttributes() {
      connectedElements?.filter(e => filterConnections(e)).forEach(e => e.remove())
    }

    function filterConnections(e: dia.Element) {
      if (e.attr().elementType != 'attribute') {
        return false
      }

      if (e.attr().elementSubType == 'composite' && (3 + element.attr().elementNum - 1) % 3 == e.attr().elementNum) {
        return false
      }

      return true
    }

    return getConfigUILayout("Attribute",
      <>
        <Stack sx={{ width: 1 }} spacing={1}>
          <Typography variant="h4">Settings:</Typography>
          <TextField id="outlined-basic" label="Name" defaultValue={text} variant="outlined" onChange={(e) => changeName(element, e.target.value)} />
          <Stack direction="row" spacing={1} sx={{ width: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="type">Type</InputLabel>
              <Select
                labelId="type"
                id="type"
                label="Type"
                defaultValue={subType}
                onChange={(e) => changeSubType(e.target.value)}
              >
                <MUI.MenuItem value={'regular'}>Regular</MUI.MenuItem>
                <MUI.MenuItem value={'key'}>Key</MUI.MenuItem>
                <MUI.MenuItem value={'partial_key'}>Partial Key</MUI.MenuItem>
                <MUI.MenuItem value={'derived'}>Derived</MUI.MenuItem>
                <MUI.MenuItem value={'multivalued'}>Multivalued</MUI.MenuItem>
                <MUI.MenuItem value={'composite'}>Composite</MUI.MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="color">Color</InputLabel>
              <Select
                labelId="color"
                id="color"
                label="Color"
                defaultValue={color}
                onChange={(e) => changeCellColor(element, e.target.value)}
              >
                {colors.map((color) =>
                  <MUI.MenuItem value={color.value}>{color.name}</MUI.MenuItem>
                )}
              </Select>
            </FormControl>
          </Stack>
        </Stack>
        {element.attr().elementSubType == 'composite' &&
          <Stack sx={{ width: 1 }} spacing={1}>
            <Typography variant="h4">Sub-Attributes:</Typography>
            <Button fullWidth variant='contained' onClick={() => { addConnectedElementBelow(element, `Sub-Attribute ${connectedElements.length}`, (attributes.elementNum + 1) % 3) }}>Add Sub-Attribute</Button>
            <Stack sx={{ width: 1 }} alignItems="center">
              {connectedElements?.filter(e => filterConnections(e)).map((attr: dia.Element, idx: number) =>
                <li key={idx} style={{ listStyleType: "none", margin: 0, padding: 0, width: '100%' }}>
                  <Stack direction="row" spacing={1} sx={{ width: 1, py: 2 }} alignItems="center">

                    <Typography variant="h5" sx={{ px: 1 }}>{idx}.</Typography>
                    <TextField sx={{ width: 1 }} id="outlined-basic" label="Attribute Name" variant="outlined" defaultValue={attr.attr()?.label?.text} onChange={(e) => changeAttributeName(e.target.value, attr.cid)} />
                    <IconButton aria-label="delete" color="error" onClick={() => deleteAttribute(attr.cid)} sx={{ aspectRatio: 1 }}>
                      <HighlightOffIcon />
                    </IconButton>
                  </Stack>
                </li>
              )}
            </Stack>
          </Stack>
        }
      </>
    )

  }

  function addConnectedElementBelow(
    sourceElement: dia.Element,
    label: string,
    elementNum: number = 0,
    offsetY: number = 100,
  ) {
    const sourcePosition = sourceElement.position();

    const shape = new MorphableShape()
    addElement('attribute', shape, false, sourcePosition.x, sourcePosition.y + offsetY, label, elementNum)

    const link = singleLine.clone();
    link.source(sourceElement);
    link.target(shape);

    graphRef.current?.addCells([shape, link]);
    setConnectedElements(prev => [...prev, shape]);

    return shape;
  }

  function changeAttributeName(val: string, cid: string) {
    connectedElements.find(e => e.cid == cid)?.prop('attrs/label/text', val);
  }

  function deleteAttribute(cid: string) {
    connectedElements.find(e => e.cid == cid)?.remove()
    setConnectedElements(prev => prev.filter((e) => e.cid !== cid));
  }

  function changeName(element: dia.Element, val: string) {
    element.prop('attrs/label/text', val);
  }

  function changeCellColor(element: dia.Element, val: string) {
    element.prop('attrs/body/fill', val);
  }

  function getEntityConfigUI(element: dia.Element) {

    var attributes = element.attr()

    var color = attributes?.body?.fill
    var subType = attributes?.elementSubType
    var text = attributes?.label?.text

    function changeSubType(val: string) {
      element.prop('attrs/elementSubType', val)
      switch (val) {
        case 'associative': {
          morphShape(element, associativeEntityMarkup, associativeEntityAttrs)
          break
        }
        case 'weak': {
          morphShape(element, weakEntityMarkup, weakEntityAttrs)
          break
        }
        case 'regular': {
          morphShape(element, rectangleMarkup, rectangleAttrs)
          break
        }
      }
    }

    return getConfigUILayout("Entity",
      <>
        <Stack sx={{ width: 1 }} spacing={1}>
          <Typography variant="h4">Settings:</Typography>
          <TextField id="outlined-basic" label="Name" defaultValue={text} variant="outlined" onChange={(e) => changeName(element, e.target.value)} />
          <Stack direction="row" spacing={1} sx={{ width: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="type">Type</InputLabel>
              <Select
                labelId="type"
                id="type"
                label="Type"
                defaultValue={subType}
                onChange={(e) => changeSubType(e.target.value)}
              >
                <MUI.MenuItem value={'regular'}>Regular</MUI.MenuItem>
                <MUI.MenuItem value={'weak'}>Weak</MUI.MenuItem>
                <MUI.MenuItem value={'associative'}>Associative</MUI.MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="color">Color</InputLabel>
              <Select
                labelId="color"
                id="color"
                label="Color"
                defaultValue={color}
                onChange={(e) => changeCellColor(element, e.target.value)}
              >
                {colors.map((color) =>
                  <MUI.MenuItem value={color.value}>{color.name}</MUI.MenuItem>
                )}
              </Select>
            </FormControl>
          </Stack>
        </Stack>
        <Stack sx={{ width: 1 }} spacing={1}>
          <Typography variant="h4">Attributes:</Typography>
          <Button fullWidth variant='contained' onClick={() => { addConnectedElementBelow(element, `Attribute ${connectedElements.length}`) }}>Add Attribute</Button>
          <Stack sx={{ width: 1 }} alignItems="center">
            {connectedElements?.filter(e => e.attr().elementType == "attribute").map((attr: dia.Element, idx: number) =>
              <li key={idx} style={{ listStyleType: "none", margin: 0, padding: 0, width: '100%' }}>
                <Stack direction="row" spacing={1} sx={{ width: 1, py: 2 }} alignItems="center">

                  <Typography variant="h5" sx={{ px: 1 }}>{idx}.</Typography>
                  <TextField sx={{ width: 1 }} id="outlined-basic" label="Attribute Name" variant="outlined" defaultValue={attr.attr()?.label?.text} onChange={(e) => changeAttributeName(e.target.value, attr.cid)} />
                  <IconButton aria-label="delete" color="error" onClick={() => deleteAttribute(attr.cid)} sx={{ aspectRatio: 1 }}>
                    <HighlightOffIcon />
                  </IconButton>
                </Stack>
              </li>
            )}
          </Stack>
        </Stack>
      </>
    )
  }

  function getLinkBetweenById(sourceId: string, targetId: string) {
    return graphRef.current?.getLinks().filter(link => {
      const source = link.get('source');
      const target = link.get('target');

      return (
        (source.id === sourceId && target.id === targetId) ||
        (source.id === targetId && target.id === sourceId)  // optional, for both directions
      );
    })[0];
  }

  function getRelationshipConfigUI(element: dia.Element) {

    var attributes = element.attr()

    var color = attributes?.body?.fill
    var subType = attributes?.elementSubType
    var text = attributes?.label?.text

    function changeSubType(val: string) {
      element.prop('attrs/elementSubType', val)
      switch (val) {
        case 'weak': {
          morphShape(element, weakRelationshipMarkup, weakRelationshipAttrs)
          break
        }
        case 'regular': {
          morphShape(element, diamondMarkup, diamondAttrs)
          break
        }
      }
    }

    function changeLink(e: dia.Link, val: string) {
      switch (val) {
        case 'optional': {
          e.prop("attrs", JSON.parse(JSON.stringify(optionalSingleLine.attr())))
          break
        }
        case 'partial': {
          e.prop("attrs", JSON.parse(JSON.stringify(singleLine.attr())))
          break
        }
        case 'total': {
          e.prop("attrs", JSON.parse(JSON.stringify(doubleLine.attr())))
          break
        }
      }
    }

    function changeLinkLabel(e: dia.Link, label: string) {
      e.labels([{
        ...e.labels()[0],
        attrs: {
          text: {
            text: label
          }
        }
      }]);
    }

    return getConfigUILayout("Relationship",
      <>
        <Stack sx={{ width: 1 }} spacing={1}>
          <Typography variant="h4">Settings:</Typography>
          <TextField id="outlined-basic" label="Name" defaultValue={text} variant="outlined" onChange={(e) => changeName(element, e.target.value)} />
          <Stack direction="row" spacing={1} sx={{ width: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="type">Type</InputLabel>
              <Select
                labelId="type"
                id="type"
                label="Type"
                defaultValue={subType}
                onChange={(e) => changeSubType(e.target.value)}
              >
                <MUI.MenuItem value={'regular'}>Regular</MUI.MenuItem>
                <MUI.MenuItem value={'weak'}>Weak</MUI.MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="color">Color</InputLabel>
              <Select
                labelId="color"
                id="color"
                label="Color"
                defaultValue={color}
                onChange={(e) => changeCellColor(element, e.target.value)}
              >
                {colors.map((color) =>
                  <MUI.MenuItem value={color.value}>{color.name}</MUI.MenuItem>
                )}
              </Select>
            </FormControl>
          </Stack>
        </Stack>
        <Stack sx={{ width: 1 }} spacing={1}>
          <Stack sx={{ width: 1 }} alignItems="center">
            {connectedElements?.map((attr: dia.Element, idx: number) => {
              var link = getLinkBetweenById(element.id as string, attr.id as string)
              var linkLabelText = ''
              if (!link?.hasLabels()) {
                link?.labels([{
                  attrs: {
                    text: {
                      text: '',
                    },
                  }
                }]);
              } else {
                linkLabelText = link.labels()?.[0]?.attrs?.text?.text as string
              }
              return (link &&
                <li key={idx} style={{ listStyleType: "none", margin: 0, padding: 0, width: '100%' }}>
                  <Typography sx={{pb: 1}} variant="h5">{String(attr.attr().label?.text).substring(0, 14) + (String(attr.attr().label?.text).length > 14 ? '...' : '')} Settings:</Typography>
                  <Stack direction="row" spacing={1} sx={{ width: 1 }} alignItems="center">
                    <FormControl fullWidth>
                      <InputLabel id="type">Type</InputLabel>
                      <Select
                        labelId="type"
                        id="type"
                        label="Type"
                        defaultValue={link.attr()?.custom?.type}
                        onChange={(e) => changeLink(link as dia.Link, e.target.value)}
                      >
                        <MUI.MenuItem value={'optional'}>Optional</MUI.MenuItem>
                        <MUI.MenuItem value={'partial'}>Partial</MUI.MenuItem>
                        <MUI.MenuItem value={'total'}>Total</MUI.MenuItem>
                      </Select>
                    </FormControl>
                    <TextField sx={{ width: 1 }} id="outlined-basic" label="Cardinality" variant="outlined" defaultValue={linkLabelText} onChange={(e) => changeLinkLabel(link as dia.Link, e.target.value)} />
                  </Stack>
                </li>
              )
            })}
          </Stack>
        </Stack>
      </>
    )
  }

  return (
    <Stack direction="row" sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ width: 'calc(100% - 350px)', height: '100%' }}>
        <Menu
          centerX={positionSelectionWheel.x}
          centerY={positionSelectionWheel.y}
          innerRadius={0}
          outerRadius={150}
          show={shouldShowSelectionWheel}
          animation={["scale"]}
          animationTimeout={75}
          drawBackground
        >
          {menuItems.map(({ label, data }) => (
            <MenuItem
              key={data}
              data={data}
              onItemClick={(_, __, d) => handleItemClick(d)}
            >
              {label}
            </MenuItem>
          ))}
        </Menu>
        <ButtonGroup variant="contained" sx={{ boxShadow: 5, position: 'fixed', zIndex: 2, m: 1 }}>
          <Tooltip title="Zoom In">
            <Button onClick={() => transformWrapperRef.current?.zoomIn()}>+</Button>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <Button onClick={() => transformWrapperRef.current?.zoomOut()}>-</Button>
          </Tooltip>
          <Tooltip title="Reset">
            <Button onClick={() => transformWrapperRef.current?.resetTransform()}>x</Button>
          </Tooltip>
          <Tooltip title="Center">
            <Button onClick={() => transformWrapperRef.current?.centerView()}>o</Button>
          </Tooltip>
        </ButtonGroup>
        <Box sx={{ position: 'fixed', zIndex: 2, right: 366, paddingTop: 1 }}>
          <Tooltip title="Click for help" arrow>
            <IconButton color="primary" onClick={handleHelpClick} sx={{
              backgroundColor: 'primary.main', // Solid color from your theme
              boxShadow: 5,
              color: 'white', // Icon color
              '&:hover': {
                backgroundColor: 'primary.dark', // Darker color on hover
              },
            }}>
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
          <Popover
            open={isHelpOpen}
            anchorEl={helpAnchorEl}
            onClose={handleHelpClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <Typography sx={{ px: 2, maxWidth: 400 }} component="div">
              <h3>Help Guide</h3>
              <p><b>Zooming:</b> You can zoom in and out using the <i>+</i> and <i>-</i> buttons, or reset zoom with the <i>Reset</i> button.</p>
              <p><b>Panning:</b> Hold down your mouse wheel while dragging to move the entire diagram.</p>
              <p><b>Element Actions (Right click or speed dial):</b></p>
              <ul>
                <li><b>Attribute:</b> Add a new attribute element.</li>
                <li><b>Entity:</b> Add a new entity element.</li>
                <li><b>Relationship:</b> Add a new relationship element.</li>
              </ul>
              <p><b>Element Selection:</b> Click and drag to select multiple elements.</p>
              <ul>
                <li>You can move selected elements by dragging them together.</li>
                <li>You can use <b>Shift</b> to multi-select.</li>
                <li>Hitting <b>Delete</b> or <b>Backspace</b> will delete the selected elements</li>
                <li>Hitting <b>Escape</b> will clear the selection</li>
              </ul>
              <p><b>File Operations:</b></p>
              <ul>
                <li><b>Save:</b> Save the current diagram as a JSON file.</li>
                <li><b>Import:</b> Import a diagram by uploading a JSON file.</li>
              </ul>
            </Typography>
          </Popover>
        </Box>
        <Box sx={{ position: 'fixed', zIndex: 2, bottom: 16, right: 366 }}>
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            onChange={handleImport}
            style={{ display: "none" }}
          />
          <Stack direction="row" spacing={2}>
            <SpeedDial
              ariaLabel="add shapes"
              icon={<ShapeLineIcon />}
            >
              <SpeedDialAction
                icon={<RectangleIcon />}
                tooltipTitle="Add Entity"
                onClick={() => handleSelection("entity")}
              />
              <SpeedDialAction
                icon={<HexagonIcon />}
                tooltipTitle="Add Relationship"
                onClick={() => handleSelection("relationship")}
              />
              <SpeedDialAction
                icon={<CircleIcon />}
                tooltipTitle="Add Attribute"
                onClick={() => handleSelection("attribute")}
              />
            </SpeedDial>
            <SpeedDial
              ariaLabel="SpeedDial actions"
              icon={<DescriptionIcon />}
            >
              <SpeedDialAction
                icon={<SaveIcon />}
                tooltipTitle="Save"
                onClick={onSave}
              />
              <SpeedDialAction
                icon={<FileUploadIcon />}
                tooltipTitle="Import"
                onClick={onImport}
              />
              <SpeedDialAction
                  icon={<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24"><text x="3" y="17" fontSize="14">SVG</text></svg>}
                  tooltipTitle="Export as SVG"
                  onClick={handleExportSVG}
              />
            </SpeedDial>
          </Stack>
        </Box>
        <Box sx={{ width: '100%', height: '100%' }} ref={boxWrapperRef}>
          <TransformWrapper
            centerOnInit={true}
            initialPositionX={-width / 2 + (boxWrapperRef.current?.clientWidth || 0) / 2}
            initialPositionY={-height / 2 + (boxWrapperRef.current?.clientHeight || 0) / 2}
            doubleClick={{ mode: 'toggle' }}
            panning={{ disabled: !panningEnabled }}
            ref={transformWrapperRef}
          >
            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
              <Box id="joinjs_graph"
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowSelectionWheel(true);
                  setPositionSelectionWheel({ x: e.clientX, y: e.clientY });
                }}
                onMouseDown={(e) => {
                  if (shouldShowSelectionWheel) {
                    setShowSelectionWheel(false)
                  }
                  const target = e.target as HTMLElement;

                  // Check if clicking an element
                  if (target.closest('.joint-element')) {
                    setPanningEnabled(false); // Disable panning while dragging an element
                  }

                  if (target.closest('.joint-link')) {
                    setPanningEnabled(false);
                  }

                  if (target.closest('.joint-tool')) {
                    setPanningEnabled(false);
                  }

                  if (e.button == 0 || e.button == 2) {
                    setPanningEnabled(false);
                  }
                }}
                onMouseUp={() => setPanningEnabled(true)}
              />
            </TransformComponent>
          </TransformWrapper>
        </Box>
      </Box>
      <Box sx={{ backgroundColor: 'white', width: '350px', height: '100%' }}>
        {elementConfigurationUI}
      </Box>
    </Stack>
  )
}

