'use client'
import {
    Box,
    Button,
    TextField,
    IconButton,
    Typography,
    Paper,
    ListItem,
    List,
    Select,
    Stack,
    MenuItem, Checkbox, Tooltip, Popover, FormControl, InputLabel
} from '@mui/material';
import { dia, shapes, elementTools, highlighters, util } from '@joint/core';
import React, { useEffect, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import * as joint from '@joint/core';
import CloseIcon from '@mui/icons-material/Close';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SaveIcon from '@mui/icons-material/Save';
import { AvoidRouter } from './avoid-router';
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";



const colors = [
    { name: 'Blue', value: '#AEC6CF' },
    { name: 'Orange', value: '#FFDAB9' },
    { name: 'Yellow', value: '#FFFFE0' },
    { name: 'Green', value: '#B0E57C' },
    { name: 'Red', value: '#FFB6C1' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Grey', value: '#D3D3D3' }
];


class SelectionManager {
    private selected = new Set<joint.dia.Element>();
    private selectionBox: dia.Element | null = null;
    private isDragging = false;
    private initialPositions: Map<string, { x: number; y: number }> = new Map();
    private dragOffset: { x: number; y: number } | null = null;
    private anchorElementId: string | null = null;

    constructor(private paper: dia.Paper, private graph: dia.Graph) {
        this.initEvents();
    }

    private initEvents() {
        this.paper.on('blank:pointerdown', (evt, x, y) => this.startSelectionBox(evt, x, y));
        this.paper.on('blank:pointerup', () => this.endSelectionBox());
        this.paper.on('blank:pointermove', (evt, x, y) => this.updateSelectionBox(x, y));

        this.paper.on('element:pointerdown', (elementView, evt) => this.startDrag(elementView, evt));
        this.paper.on('element:pointermove', (elementView, evt, x, y) => this.dragSelected(x, y));
        this.paper.on('element:pointerup', () => this.endDrag());
    }

    private startSelectionBox(evt: dia.Event, x: number, y: number) {
        if ((evt.originalEvent as MouseEvent).button !== 0) return;
        this.clearSelection();

        const box = new shapes.standard.Rectangle();
        box.position(x, y);
        box.resize(1, 1);
        box.id = "selectionBBOXElement";
        box.attr({ body: { fill: 'rgba(0, 0, 255, 0.1)', stroke: 'blue', strokeDasharray: '5,5' } });
        box.addTo(this.graph);
        this.selectionBox = box;
        this.isDragging = true;
    }

    private updateSelectionBox(x: number, y: number) {
        if (!this.isDragging || !this.selectionBox) return;
        const start = this.selectionBox.position();
        const width = Math.abs(x - start.x);
        const height = Math.abs(y - start.y);
        const newX = Math.min(x, start.x);
        const newY = Math.min(y, start.y);
        this.selectionBox.resize(width, height);
        this.selectionBox.position(newX, newY);
    }

    private endSelectionBox() {
        if (!this.selectionBox) return;
        const bbox = this.selectionBox.getBBox();
        this.graph.getElements().forEach(el => {
            if (el.id !== "selectionBBOXElement" && bbox.containsRect(el.getBBox())) {
                this.add(el);
            }
        });
        this.selectionBox.remove();
        this.selectionBox = null;
        this.isDragging = false;
    }

    private startDrag(elementView: dia.ElementView, evt: dia.Event) {
        const model = elementView.model;
        this.anchorElementId = model.id;

        if (!this.selected.has(model)) {
            this.clearSelection();
            this.add(model);
        }

        // Track initial positions of all selected elements
        this.initialPositions.clear();
        this.selected.forEach((el) => {
            this.initialPositions.set(el.id, el.position());
        });

        // Track the offset between the mouse click and the element's position
        const pointerEvent = evt as joint.dia.Event;
        const clickCoords = this.paper.clientToLocalPoint(pointerEvent.clientX, pointerEvent.clientY);
        const elementPos = model.position();
        this.dragOffset = {
            x: clickCoords.x - elementPos.x,
            y: clickCoords.y - elementPos.y
        };
    }

    private dragSelected(mouseX: number, mouseY: number) {
        if (!this.dragOffset) return;

        // Actual mouse position adjusted to apply same offset
        const adjustedX = mouseX - this.dragOffset.x;
        const adjustedY = mouseY - this.dragOffset.y;

        // Calculate how much the lead element moved
        const lead = this.anchorElementId
            ? this.graph.getCell(this.anchorElementId) as dia.Element
            : [...this.selected][0];
        const start = this.initialPositions.get(lead.id);
        if (!start) return;

        const dx = adjustedX - start.x;
        const dy = adjustedY - start.y;

        // Apply to all selected elements
        this.selected.forEach(el => {
            const original = this.initialPositions.get(el.id);
            if (original) {
                el.position(original.x + dx, original.y + dy);
            }
        });
    }

    private endDrag() {
        this.initialPositions.clear();
        this.dragOffset = null;
        this.anchorElementId = null;
    }

    toggle(el: dia.Element) {
        if (this.selected.has(el)) {
            el.attr('body/stroke', 'black');
            this.selected.delete(el);
        } else {
            this.add(el);
        }
    }

    add(el: dia.Element) {
        el.attr('body/stroke', 'blue');
        el.attr('header/stroke', 'blue');
        this.selected.add(el);
    }

    clearSelection() {
        this.selected.forEach(el => el.attr('body/stroke', 'black'));
        this.selected.forEach(el => el.attr('header/stroke', 'black'));
        this.selected.clear();
    }

    getSelected() {
        return Array.from(this.selected);
    }

    deleteSelected() {
        this.getSelected().forEach(el => el.remove());
        this.clearSelection();
    }
}


export default function CrowsNotation() {
    const [paper, setPaper] = useState<dia.Paper>()
    const [graph, setGraph] = useState<dia.Graph>()
    const [panningEnabled, setPanningEnabled] = useState<boolean>(true)
    const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null)
    const boxWrapperRef = useRef<HTMLElement>(null)
    const selectedCells = useRef<dia.Cell[]>([])
    const width = 8000
    const height = 8000
    const elementWidth = 200
    const elementHeight = 100


    const [open, setOpen] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<dia.Element | null>(null);
    const [entityName, setEntityName] = useState("");
    const [attributes, setAttributes] = useState<{ name: string; isKey: boolean }[]>([]);
    const [allEntities, setAllEntities] = useState<dia.Element[]>([]);
    const [connectedEntities, setConnectedEntities] = useState<dia.Element[]>([]);
    const [selectionManager, setSelectionManager] = useState<SelectionManager | null>(null);

    type LinkEnd = 'source' | 'target';
    type LinkTypeMap = { [linkId: string]: { source: string; target: string } };
    const [linkTypes, setLinkTypes] = useState<LinkTypeMap>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [crowMarkers, setCrowMarkers] = useState<Record<string, any>>({});

    const [helpAnchorEl, setHelpAnchorEl] = useState<null | HTMLElement>(null);
    const isHelpOpen = Boolean(helpAnchorEl);

    const FG_COLOR = "black";
    const BG_COLOR = "white";

    const shiftHeld = useRef(false);

    const handleHelpClick = (event: React.MouseEvent<HTMLElement>) => {
        setHelpAnchorEl(event.currentTarget);
    };

    const handleHelpClose = () => {
        setHelpAnchorEl(null);
    };

    useEffect(() => {
        const markers = {
            'Zero or One': util.svg`
    <path d="M 5 -5 V 5" stroke-width="2" fill="none" />
    <circle cx="14" r="4" stroke-width="2" fill="${BG_COLOR}" />
  `,
            'One and Only One': util.svg`
    <path d="M 5 -5 V 5 M 10 -5 V 5" stroke-width="2" fill="${FG_COLOR}" />
  `,
            'Zero or Many': util.svg`
    <path d="M 0 -4 L 10 0 M 0 4 L 10 0 M 0 0 H 10" stroke-width="2" fill="none" />
    <circle cx="14" r="4" fill="${BG_COLOR}" stroke-width="2" />
  `,
            'One or Many': util.svg`
    <path d="M 0 -4 L 10 0 M 0 4 L 10 0 M 10 -5 V 5" stroke-width="2" />
  `
        };

        setCrowMarkers(markers);
    }, []);

    useEffect(() => {
        const customCursor = `url('data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">
        <circle cx="24" cy="24" r="18" fill="white" stroke="blue" stroke-width="2"/>
        <text x="50%" y="55%" font-size="24" font-weight="bold" text-anchor="middle" fill="blue" dominant-baseline="middle">+</text>
      </svg>
    `)}'), auto`;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                shiftHeld.current = true;
                document.body.style.cursor = customCursor;
            }

            if (e.key === 'Control' || e.metaKey) {
                setPanningEnabled(false);
            }

            const isTextInput =
                (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement);

            if (isTextInput) return;
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // Reset on any key release if Shift is no longer being held
            if (!e.shiftKey) {
                shiftHeld.current = false;
                document.body.style.cursor = 'auto';
            }
            if (e.key === 'Control' || !e.ctrlKey) {
                setPanningEnabled(true);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const activeTag = (document.activeElement as HTMLElement)?.tagName;
            const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable;

            if (isTyping) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                selectionManager?.deleteSelected();
                setSelectedEntity(null);
                setEntityName('');
                setAttributes([]);
                setConnectedEntities([]);
            } else if (e.key === 'Escape') {
                selectionManager?.clearSelection();
            }
        };

        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [selectionManager]);

    useEffect(() => {
        if (!selectedEntity) return;

        // Update entity name
        selectedEntity.attr('headerText/text', entityName);

        // Format attributes
        const attrText = attributes.map(attr => attr.isKey ? `* ${attr.name}` : attr.name).join('\n');
        selectedEntity.attr('bodyText/text', attrText);
    }, [entityName, attributes, selectedEntity]);

    useEffect(() => {
        if (!graph) return;

        Object.entries(linkTypes).forEach(([linkId, types]) => {
            const link = graph.getCell(linkId) as dia.Link;
            if (!link || !link.isLink()) return;

            ['source', 'target'].forEach((side) => {
                const value = (types as any)[side];
                if (!value || !crowMarkers[value]) return;

                // Remove old marker and apply new one
                link.removeAttr(`line/${side}Marker/markup`);
                link.attr(`line/${side}Marker/markup`, crowMarkers[value]);
                link.attr(`custom/${side}Type`, value);
            });
        });
    }, [linkTypes, crowMarkers, graph]);

    useEffect(() => {
    }, [connectedEntities]);

    useEffect(() => {
        const namespace = shapes;
        const graph = new dia.Graph({}, { cellNamespace: namespace });
        setGraph(graph);

        const paper = new dia.Paper({
            el: document.getElementById('crows_foot_graph'),
            model: graph,
            width: width,
            height: height - 50,
            gridSize: 10,
            drawGrid: { color: '#c9c9c9', thickness: 1, name: 'mesh' },
            interactive: true,
            background: { color: '#F5F5F5' },
            cellViewNamespace: namespace,
            defaultConnectionPoint: {
                name: 'boundary',
                args: { sticky: true, perpendicular: true }
            },
            validateConnection: (srcView, srcMagnet, tgtView, tgtMagnet, end) => {
                const source = srcView.model;
                const target = tgtView.model;
                if (source === target) return false;
                return source.isElement() && target.isElement();
            },
            defaultLink: new shapes.standard.Link({
                attrs: {
                    line: {
                        stroke: '#000',
                        strokeWidth: 2,
                        sourceMarker: {
                            markup: util.svg`
                            <path d="M 5 -5 V 5" stroke-width="2" fill="none" />
                            <circle cx="14" r="4" stroke-width="2" fill="${BG_COLOR}" />
                        `
                        },
                        targetMarker: {
                            markup: util.svg`
                            <path d="M 5 -5 V 5" stroke-width="2" fill="none" />
                            <circle cx="14" r="4" stroke-width="2" fill="${BG_COLOR}" />
                        `
                        }
                    }
                },
                //router:{name:"orthogonal"},
                connector: { name: 'rounded' }
            })
        });

        paper.on('element:pointerclick', (elementView, evt) => {
            const element = elementView.model;
            const isCtrlHeld = (evt.originalEvent as MouseEvent).ctrlKey || (evt.originalEvent as MouseEvent).metaKey;

            if (isCtrlHeld) {
                // CTRL+Click toggles selection
                selectionManager?.toggle(element);
                setSelectedEntity(null); // Clear sidebar
                setEntityName('');
                setAttributes([]);
            } else {
                // Normal click behavior
                selectionManager?.clearSelection();
                selectionManager?.add(element);
                if (!isCtrlHeld && selectionManager?.getSelected().length === 1) {
                    setSelectedEntity(element); // ✅ ensure it's tracked
                }

                setSelectedEntity(element);
                setEntityName(element.attr('headerText/text') || "");
                const rawAttrs = element.attr('bodyText/text')?.split('\n') || [];
                setAttributes(rawAttrs.map(attr => ({
                    name: attr.replace(/^\*\s*/, ''),
                    isKey: attr.startsWith('* ')
                })));

                highlighters.mask.removeAll(paper);
                highlighters.mask.add(elementView, { selector: 'root' }, 'selection-highlight', {
                    deep: true,
                    attrs: { stroke: '#FF4365', 'stroke-width': 3 }
                });
            }
        });

        paper.on('blank:pointerclick', () => {
            setSelectedEntity(null);
            setEntityName('');
            setAttributes([]);
            setConnectedEntities([]);
            highlighters.mask.removeAll(paper);
        });

        paper.on('element:mouseenter', (elementView) => {
            elementView.showTools();
        });

        paper.on('element:mouseleave', (elementView) => {
            elementView.hideTools();
        });

        paper.on('link:connect', (linkView, evt, elementViewConnected) => {
            const link = linkView.model;
            if (!link.get('target')?.id) {
                link.remove();
            }
        });

        paper.on('link:pointerup', (linkView) => {
            const link = linkView.model;
            if (!link.get('target')?.id) {
                link.remove();
            }
        });

        setGraph(graph);

        const routerWorker = new Worker(new URL("./worker.js", import.meta.url));
        (window as any).routerWorker = routerWorker;

        routerWorker.onmessage = (e) => {
            const { command, ...data } = e.data;
            switch (command) {
                case 'routed': {
                    const { cells } = data;
                    cells.forEach((cell: joint.dia.Link) => {
                        const model = graph.getCell(cell.id);
                        if (model.isElement()) return;
                        model.set({
                            vertices: cell.vertices,
                            source: cell.source,
                            target: cell.target,
                            router: null
                        }, {
                            fromWorker: true
                        });
                    });
                    highlighters.addClass.removeAll(paper, 'awaiting-update');
                    break;
                }
                default:
                    console.log('Unknown command', command);
                    break;
            }
        }



        routerWorker.postMessage([{
            command: 'reset',
            cells: graph.toJSON().cells
        }]);

        graph.on('change', (cell, opt) => {

            if (opt.fromWorker) {
                return;
            }

            if (graph.getElements().find(el => el.id == "selectionBBOXElement")) {
                return;
            }


            if (cell.isElement() && (cell.hasChanged('position') || cell.hasChanged('size'))) {
                const links = graph.getConnectedLinks(cell);
                links.forEach((link) => {
                    link.router() || link.router('rightAngle');
                    highlighters.addClass.add(link.findView(paper), 'line', 'awaiting-update', {
                        className: 'awaiting-update'
                    });
                });
            }

        });

        graph.on('remove', (cell) => {
            if (cell.id === selectedEntity?.id) {
                console.log("Selected entity was deleted");
                setSelectedEntity(null);
                setEntityName('');
                setAttributes([]);
                setConnectedEntities([]);
            }
            routerWorker.postMessage([{ command: 'remove', id: cell.id }]);


            // If any of the current links were deleted
            if (selectedEntity && (cell.isLink() || cell.id === selectedEntity.id)) {
                refreshConnectedEntities();
            }
        });

        graph.on('add', (cell) => {
            if (cell.id == "selectionBBOXElement") {
                return
            }
            routerWorker.postMessage([{
                command: 'add',
                cell: cell.toJSON()
            }]);

            if (selectedEntity && (cell.isLink() || cell.id === selectedEntity.id)) {
                refreshConnectedEntities();
            }

        });

        graph.on('change:position', (element) => {
            if ((window as any).routerWorker) {
                (window as any).routerWorker.postMessage([
                    { command: 'reroute' }
                ]);
            }
        });


        paper.on('link:snap:disconnect', (linkView) => {
            linkView.model.set({
                vertices: [],
                router: null
            });
        });

        AvoidRouter.load().then(() => {
            const router = new AvoidRouter(graph, {
                shapeBufferDistance: 20,        // Distance around elements to avoid
                idealNudgingDistance: 80,        // How far to push links apart
                portConstraints: false,           // Helps isolate links at separate points
                portOffset: 15,                  // Adds spacing between entry points
                maximumLoops: 1000,              // Helps avoid tight loops
                vertexPadding: 30,               // Extra padding between bends
                routeOnEveryChange: false         // Ensure rerouting is more aggressive
            });

            router.addGraphListeners();
        });

        paper.on('element:pointerup', () => {
            (window as any).routerWorker?.postMessage([{ command: 'reroute' }]);
        });

        setPaper(paper)
        setSelectionManager(new SelectionManager(paper, graph));


    }, []);

    useEffect(() => {
        refreshConnectedEntities();
    }, [selectedEntity, graph]);

    useEffect(() => {
        if (!graph || !selectedEntity) return;

        const updateConnections = () => {
            refreshConnectedEntities();
        };

        // Listen for *any change* in the graph
        graph.on('change', updateConnections);
        graph.on('add', updateConnections);
        graph.on('remove', updateConnections);

        // Initial run
        refreshConnectedEntities();

        // Cleanup listener when selectedEntity changes
        return () => {
            graph.off('change', updateConnections);
            graph.off('add', updateConnections);
            graph.off('remove', updateConnections);
        };
    }, [graph, selectedEntity]);

    const addEntity = () => {
        if (graph && paper) {
            const entity = new shapes.standard.HeaderedRectangle();
            entity.position(width / 2 - elementWidth / 2, height / 2 - elementHeight / 2);
            entity.resize(elementWidth, elementHeight * (1 + (0.1 * attributes.length)));

            setSelectedEntity(entity);
            setAttributes(entity.attr('bodyText/text')?.split('\n') || []);
            highlighters.mask.removeAll(paper);

            entity.attr('headerText/text', name);
            entity.attr('headerText/fontSize', 20);
            entity.attr('headerText/fontWeight', 'bold');
            entity.attr('header/fill', '#000000');
            entity.attr('header/fillOpacity', 0.1);
            entity.attr('bodyText/text', attributes.join("\n"));
            entity.attr('bodyText/fontSize', 15);
            entity.attr('body/fill', 'rgba(254,133,79,0)');
            entity.attr('body/fillOpacity', 0.5);

            const boundaryTool = new elementTools.Boundary();
            const removeButton = new elementTools.Remove({
                useModelGeometry: true,
                x: '10%',
                y: '50%'
            });
            const connectTool = new elementTools.Connect({
                useModelGeometry: true,
                x: '90%',
                y: '50%'
            });

            const toolsView = new dia.ToolsView({
                name: 'basic-tools',
                tools: [boundaryTool, removeButton, connectTool]
            });

            entity.addTo(graph);

            const shapeView = entity.findView(paper);
            shapeView.addTools(toolsView);
            shapeView.hideTools();
        }
    };

    useEffect(() => {
        if (!selectedEntity || !paper) return;

        const view = selectedEntity.findView(paper);
        const bodyTextEl = view?.findBySelector('bodyText')?.[0] as SVGGraphicsElement | undefined;

        if (bodyTextEl) {
            // Force reflow before measuring
            requestAnimationFrame(() => {
                const textBBox = bodyTextEl.getBBox();

                const bodyY = selectedEntity.attr('bodyText/ref-y') || 0;
                const headerHeight = 30;
                const padding = 10;

                const newHeight = headerHeight + bodyY + textBBox.height + padding;
                selectedEntity.resize(elementWidth, newHeight);
            });
        } else {
            // Fallback size if text node doesn't exist
            const fallbackHeight = 100 + attributes.length * 15;
            selectedEntity.resize(elementWidth, fallbackHeight);
        }
    }, [attributes, selectedEntity, paper]);



    const addEntityAt = (x: number, y: number) => {
        if (!graph || !paper) return;

        const entity = new shapes.standard.HeaderedRectangle();
        entity.position(x, y);
        //entity.resize(elementWidth, elementHeight * (1 + (0.1 * attributes.length)));
        entity.resize(elementWidth, elementHeight);

        setSelectedEntity(entity);
        setAttributes([]);

        selectionManager?.add(entity);      // ✅ select new entity
        setSelectedEntity(entity);          // ✅ show in sidebar

        entity.attr('headerText/text', '');
        entity.attr('headerText/fontSize', 20);
        entity.attr('headerText/fontWeight', 'bold');

        entity.attr('header/fill', '#000000');
        entity.attr('header/fillOpacity', 0.1);

        entity.attr('bodyText/text', '');
        entity.attr('bodyText/ref-y', 1);
        entity.attr('bodyText/fontSize', 15);

// ✅ Added for left-aligned multiline support
        entity.attr('bodyText/ref-x', 0);               // Start at the left
        entity.attr('bodyText/ref-dx', null);           // ✅ Cancel horizontal offset
        entity.attr('bodyText/ref-x2', null);           // ✅ Cancel mirrored offset
        entity.attr('bodyText/ref', 'body');            // Anchor inside body
        entity.attr('bodyText/style', { whiteSpace: 'pre' });

        entity.attr('body/fill', '#FFFFFF');
        entity.attr('body/fillOpacity', 0.5);

        const boundaryTool = new elementTools.Boundary();
        const removeButton = new elementTools.Remove({ useModelGeometry: true, x: '10%', y: '50%' });
        const connectTool = new elementTools.Connect({ useModelGeometry: true, x: '90%', y: '50%' });

        const toolsView = new dia.ToolsView({
            name: 'basic-tools',
            tools: [boundaryTool, removeButton, connectTool]
        });

        entity.addTo(graph);
        const shapeView = entity.findView(paper);
        shapeView.addTools(toolsView);
        shapeView.hideTools();
    };

    const handleSave = () => {
        if (selectedEntity) {
            selectedEntity.attr('headerText/text', entityName);
            const attrText = attributes.map(attr => attr.isKey ? `* ${attr.name}` : attr.name).join('\n');
            selectedEntity.attr('bodyText/text', attrText);
        }
    };

    const handleExport = () => {
        if (!graph) return;

        const jsonString = JSON.stringify(graph.toJSON(), null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = "diagram.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !graph) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const json = JSON.parse(text);

                const elements: dia.Element[] = [];
                const links: dia.Link[] = [];

                for (const cell of json.cells) {
                    if (cell.type?.startsWith("standard.")) {
                        const typeKey = cell.type.split(".")[1];
                        const ElementClass = (shapes.standard as any)[typeKey];
                        if (ElementClass) {
                            const element = new ElementClass(cell);
                            elements.push(element);
                        } else {
                            console.warn("Unknown element type:", cell.type);
                        }
                    } else if (cell.type === "link" || cell.type?.includes("Link")) {
                        const link = new shapes.standard.Link(cell);
                        links.push(link);
                    }
                }

                graph.clear();
                [...elements, ...links].forEach(cell => cell.addTo(graph));


                console.log("✅ Imported with", elements.length, "elements and", links.length, "links.");
            } catch (error) {
                console.error("❌ Import failed:", error);
            }

            if (paper) {
                graph.getElements().forEach((element) => {
                    const boundaryTool = new elementTools.Boundary();
                    const removeButton = new elementTools.Remove({
                        useModelGeometry: true,
                        x: '10%',
                        y: '50%'
                    });
                    const connectTool = new elementTools.Connect({
                        useModelGeometry: true,
                        x: '90%',
                        y: '50%'
                    });

                    const toolsView = new dia.ToolsView({
                        name: 'basic-tools',
                        tools: [boundaryTool, removeButton, connectTool]
                    });

                    const view = element.findView(paper);
                    view.addTools(toolsView);
                    view.hideTools(); // Hide initially
                });
            }
        };

        reader.readAsText(file);
    };


    const triggerFileDialog = () => {
        fileInputRef.current?.click();
    };

    function refreshConnectedEntities(entity: dia.Element | null = selectedEntity) {
        if (!graph || !entity) {
            setConnectedEntities([]);
            return;
        }

        const links = graph.getConnectedLinks(entity);
        const connected = links
            .map(link => {
                const sourceId = link.get('source')?.id;
                const targetId = link.get('target')?.id;
                const otherId = entity.id === sourceId ? targetId : sourceId;
                return graph.getCell(otherId!);
            })
            .filter(cell => cell && cell.isElement());

        setConnectedEntities(connected as dia.Element[]);
    }

    return (
        <Stack direction="row" sx={{width: 1, height: 1}}>
            <input
                type="file"
                accept="application/json"
                ref={fileInputRef}
                onChange={handleImport}
                style={{display: "none"}}
            />
            <Box sx={{width: 'calc(100% - 350px)', height: '100%'}}>
                <Box sx={{position: 'fixed', zIndex: 2}}>
                    <Button variant="contained" onClick={() => transformWrapperRef.current?.zoomIn()}>+</Button>
                    <Button variant="contained" onClick={() => transformWrapperRef.current?.zoomOut()}>-</Button>
                    <Button variant="contained" onClick={() => transformWrapperRef.current?.resetTransform()}>x</Button>
                    <Button variant="contained" onClick={() => transformWrapperRef.current?.centerView()}>o</Button>


                </Box>
                <Box sx={{width: '100%', height: '100%'}} ref={boxWrapperRef}>
                    <TransformWrapper
                        centerOnInit={true}
                        initialPositionX={-width / 2 + (boxWrapperRef.current?.clientWidth || 0) / 2}
                        initialPositionY={-height / 2 + (boxWrapperRef.current?.clientHeight || 0) / 2}
                        doubleClick={{mode: 'toggle'}}
                        panning={{disabled: !panningEnabled}}
                        ref={transformWrapperRef}
                    >
                        <TransformComponent wrapperStyle={{width: '100%', height: '100%'}}>
                            <Box id="crows_foot_graph"
                                 onMouseDown={(e) => {
                                     const target = e.target as HTMLElement;

                                     if (shiftHeld.current && e.button === 0) {
                                         // SHIFT + Left Click: Add entity at click location
                                         const rect = boxWrapperRef.current?.getBoundingClientRect();
                                         const localX = e.clientX - (rect?.left ?? 0);
                                         const localY = e.clientY - (rect?.top ?? 0);

                                         const transform = transformWrapperRef.current?.instance.transformState;
                                         const graphX = (localX - (transform?.positionX ?? 0)) / (transform?.scale ?? 1);
                                         const graphY = (localY - (transform?.positionY ?? 0)) / (transform?.scale ?? 1);

                                         // Call a function to add entity
                                         addEntityAt(graphX, graphY);
                                         return;
                                     }


                                     if (target.closest('.joint-element')) {
                                         setPanningEnabled(false);
                                     }
                                     if (target.closest('.joint-link')) {
                                         setPanningEnabled(false);
                                     }
                                     if (target.closest('.joint-tool')) {
                                         setPanningEnabled(false);
                                     }
                                 }}
                                 onMouseUp={() => setPanningEnabled(true)}
                            />
                        </TransformComponent>
                    </TransformWrapper>
                </Box>
                <Box sx={{ position: 'fixed', bottom: 16, right: 365, zIndex: 2 }}>
                    <SpeedDial
                        ariaLabel="Import/Export Diagram"
                        icon={<SaveIcon />}
                    >
                        <SpeedDialAction
                            icon={<SaveIcon />}
                            tooltipTitle="Export"
                            onClick={handleExport}
                        />
                        <SpeedDialAction
                            icon={<FileUploadIcon />}
                            tooltipTitle="Import"
                            onClick={triggerFileDialog}
                        />
                    </SpeedDial>
                </Box>
            </Box>
            <Box sx={{ position: 'fixed', zIndex: 2, right: 366, paddingTop: 1 }}>
                <Tooltip title="Click for help" arrow>
                    <IconButton
                        color="primary"
                        onClick={handleHelpClick}
                        sx={{
                            backgroundColor: 'primary.main',
                            boxShadow: 5,
                            color: 'white',
                            '&:hover': {
                                backgroundColor: 'primary.dark',
                            },
                        }}
                    >
                        <HelpOutlineIcon />
                    </IconButton>
                </Tooltip>

                <Popover
                    open={isHelpOpen}
                    anchorEl={helpAnchorEl}
                    onClose={handleHelpClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <Box sx={{ px: 2, py: 1, maxWidth: 300 }}>
                        <Typography variant="h6" gutterBottom>Help Guide</Typography>
                        <Typography variant="body2"><b>Zoom:</b> + and -</Typography>
                        <Typography variant="body2"><b>Reset:</b> x</Typography>
                        <Typography variant="body2"><b>Center:</b> o</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}><b>Tips:</b></Typography>
                        <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                            <li><Typography variant="body2">Add entities and attributes</Typography></li>
                            <li><Typography variant="body2">Drag from the arrow to create links</Typography></li>
                            <li><Typography variant="body2">Use checkboxes to mark key attributes</Typography></li>
                        </ul>
                    </Box>
                </Popover>
            </Box>
            <Paper elevation={3} sx={{ height: '100%', width: '350px', overflowY: 'auto' }}>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                {selectedEntity ? (
                    <Stack sx={{ width: 1, pt: 2 }} alignItems="center" spacing={3}>
                        <Paper elevation={5} sx={{ textAlign: 'center', width: 0.8, p: 2 }}>
                            <Typography variant="h3">Entity</Typography>
                        </Paper>

                        {/* Settings Section */}
                        <Box sx={{ width: '90%' }}>
                            <Typography variant="h4">Settings:</Typography>
                            <TextField
                                fullWidth
                                label="Name"
                                value={entityName}
                                onChange={(e) => setEntityName(e.target.value)}
                                sx={{ mt: 1 }}
                            />
                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel id="color">Color</InputLabel>
                                <Select
                                    labelId="color"
                                    id="color"
                                    label="Color"
                                    value={selectedEntity?.attr('body/fill') || ''}
                                    onChange={(e) => {
                                        selectedEntity?.attr('body/fill', e.target.value);
                                    }}
                                >
                                    {colors.map((color, idx) => (
                                        <MenuItem key={idx} value={color.value}>
                                            {color.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                        </Box>

                        {/* Attributes Section */}
                        <Box sx={{ width: '90%' }}>
                            <Typography variant="h4">Attributes:</Typography>
                            <Stack spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                {attributes.map((attr, index) => (
                                    <Stack
                                        key={index}
                                        direction="row"
                                        spacing={1}
                                        sx={{ width: 1 }}
                                        alignItems="center"
                                    >
                                        <Typography variant="h5" sx={{ width: 20 }}>{index + 1}.</Typography>
                                        <Checkbox
                                            size="small"
                                            checked={attr.isKey}
                                            onChange={(e) => {
                                                const newAttrs = [...attributes];
                                                newAttrs[index].isKey = e.target.checked;
                                                setAttributes(newAttrs);
                                            }}
                                        />
                                        <TextField
                                            size="small"
                                            label="Attribute Name"
                                            value={attr.name}
                                            onChange={(e) => {
                                                const newAttrs = [...attributes];
                                                newAttrs[index].name = e.target.value;
                                                setAttributes(newAttrs);
                                            }}
                                            sx={{ flexGrow: 1 }}
                                        />
                                        <IconButton
                                            onClick={() =>
                                                setAttributes(attributes.filter((_, i) => i !== index))
                                            }
                                            size="small"
                                            sx={{ color: 'error.main' }}
                                        >
                                            <HighlightOffIcon />
                                        </IconButton>
                                    </Stack>
                                ))}
                                <Button
                                    fullWidth
                                    variant="contained"
                                    onClick={() =>
                                        setAttributes([...attributes, { name: "New Attribute", isKey: false }])
                                    }
                                >
                                    + Add Attribute
                                </Button>
                            </Stack>
                        </Box>

                        {/* Connections Section */}
                        <Box sx={{ width: '90%' }}>
                            <Typography variant="h4">Connections:</Typography>
                            <Stack spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                {connectedEntities.length === 0 ? (
                                    <Typography variant="body1">No connections</Typography>
                                ) : connectedEntities.map((entity, index) => {
                                    const links = graph?.getConnectedLinks(selectedEntity!) || [];
                                    const link = links.find(link => {
                                        const sourceId = link.get('source')?.id;
                                        const targetId = link.get('target')?.id;
                                        return (
                                            (sourceId === selectedEntity!.id && targetId === entity.id) ||
                                            (sourceId === entity.id && targetId === selectedEntity!.id)
                                        );
                                    });

                                    if (!link) return null;

                                    const linkId = link.id;
                                    const isSource = link.get('source')?.id === selectedEntity!.id;
                                    const side: 'source' | 'target' = isSource ? 'source' : 'target';
                                    const currentType = linkTypes[linkId]?.[side] || 'Zero or One';

                                    return (
                                        <Stack key={index} direction="row" spacing={1} sx={{ width: 1 }} alignItems="center">
                                            <FormControl fullWidth>
                                                <Select
                                                    value={currentType}
                                                    onChange={(e) => {
                                                        const value = e.target.value;

                                                        setLinkTypes(prev => ({
                                                            ...prev,
                                                            [link.id]: {
                                                                ...prev[link.id],
                                                                [side]: value
                                                            }
                                                        }));
                                                    }}
                                                    size="small"
                                                >
                                                    {Object.keys(crowMarkers).map((opt, idx) => (
                                                        <MenuItem key={idx} value={opt}>{opt}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                            <Typography sx={{ flexGrow: 1 }}>
                                                {entity.attr('headerText/text') || 'Unnamed Entity'}
                                            </Typography>
                                            <IconButton onClick={() => {
                                                const linkToRemove = graph?.getConnectedLinks(selectedEntity!)
                                                    .find(link => {
                                                        const sourceId = link.get('source')?.id;
                                                        const targetId = link.get('target')?.id;
                                                        return (
                                                            (sourceId === selectedEntity!.id && targetId === entity.id) ||
                                                            (sourceId === entity.id && targetId === selectedEntity!.id)
                                                        );
                                                    });
                                                if (linkToRemove) {
                                                    linkToRemove.remove();
                                                    refreshConnectedEntities();
                                                    setConnectedEntities(prev => prev.filter(e => e.id !== entity.id));
                                                }
                                            }}>
                                                <CloseIcon />
                                            </IconButton>
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        </Box>
                    </Stack>
                ) : (
                    <Typography variant="h6" sx={{ textAlign: 'center', mt: 3 }}>
                        Select an entity
                    </Typography>
                )}
                </Box>
            </Paper>

        </Stack>
    );
}