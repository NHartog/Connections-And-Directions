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
    MenuItem
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

const crowOptions = [
    { value: 'zeroOrOne', label: 'Zero or One' },
    { value: 'oneOnly', label: 'One and Only One' },
    { value: 'zeroOrMany', label: 'Zero or Many' },
    { value: 'oneOrMany', label: 'One or Many' }
];

const crowMarkers = {
    'Zero or One': util.svg`<path d="M 5 -5 V 5 M 10 -5 V 5" stroke-width="2" fill="none" />`, // two vertical bars
    'One and Only One': util.svg`<path d="M 5 -5 V 5 M 10 -5 V 5" stroke-width="2" fill="black" />`, // solid bars
    'Zero or Many': util.svg`
        <path d="M 15 0 A 5 5 0 1 1 5 0 A 5 5 0 1 1 15 0 Z" fill="white" stroke="black" stroke-width="2"/>
        <path d="M 20 -5 L 10 0 L 20 5 Z" fill="black"/>
    `, // circle and arrow
    'One or Many': util.svg`
        <path d="M 20 -5 L 10 0 L 20 5 Z" fill="black"/>
        <path d="M 5 -5 V 5 M 10 -5 V 5" stroke-width="2" fill="black" />
    ` // arrow and bar
};

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
    const [attributes, setAttributes] = useState<string[]>([]);
    const [allEntities, setAllEntities] = useState<dia.Element[]>([]);
    const [connectedEntities, setConnectedEntities] = useState<dia.Element[]>([]);
    type LinkEnd = 'source' | 'target';
    type LinkTypeMap = { [linkId: string]: { source: string; target: string } };
    const [linkTypes, setLinkTypes] = useState<LinkTypeMap>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        console.log('Sidebar should re-render with:', connectedEntities);
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
                            <path d="M 5 -5 V 5 M 10 -5 V 5" stroke-width="2" fill="#000" />
                        `
                        },
                        targetMarker: {
                            markup: util.svg`
                            <path d="M 5 -5 V 5 M 10 -5 V 5" stroke-width="2" fill="#000" />
                        `
                        }
                    }
                },
                //router:{name:"orthogonal"},
                connector: { name: 'rounded' }
            })
        });

        paper.on('element:pointerclick', (elementView) => {
            const element = elementView.model;
            if (selectedEntity?.id === element.id) {
                setSelectedEntity(null);
                setEntityName("");
                setAttributes([]);
                highlighters.mask.removeAll(paper);
            } else {
                setSelectedEntity(element);
                setEntityName(element.attr('headerText/text') || "");
                setAttributes(element.attr('bodyText/text')?.split('\n') || []);
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
            const target = link.get('target');
            if (!target || !target.id) {
                link.remove(); // Remove dangling link
            }
        });

        setGraph(graph);

        const routerWorker = new Worker(new URL("./worker.js", import.meta.url));

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

            routerWorker.postMessage([{
                command: 'change',
                cell: cell.toJSON()
            }]);

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
            if (cell.id == "selectionBBOXElement") {
                return
            }
            routerWorker.postMessage([{
                command: 'remove',
                id: cell.id
            }]);
        });

        graph.on('add', (cell) => {
            if (cell.id == "selectionBBOXElement") {
                return
            }
            routerWorker.postMessage([{
                command: 'add',
                cell: cell.toJSON()
            }]);

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
            router.routeAll();
        });

        setPaper(paper)

    }, []);

    useEffect(() => {
        if (!graph || !selectedEntity) {
            setConnectedEntities([]);
            return;
        }

        const links = graph.getConnectedLinks(selectedEntity);
        const connected = links
            .map(link => {
                const targetId = link.get('target')?.id;
                const sourceId = link.get('source')?.id;
                const otherId = selectedEntity.id === sourceId ? targetId : sourceId;
                return graph.getCell(otherId!);
            })
            .filter(cell => cell && cell.isElement());

        setConnectedEntities(connected as dia.Element[]);
    }, [selectedEntity, graph]);

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

    const handleSave = () => {
        if (selectedEntity) {
            selectedEntity.attr('headerText/text', entityName);
            selectedEntity.attr('bodyText/text', attributes.join("\n"));
        }
        console.log(allEntities)
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
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const json = JSON.parse(text);

                if (graph) {
                    graph.fromJSON(json);

                    const newLinkTypes: LinkTypeMap = {};

                    graph.getLinks().forEach((link) => {
                        const sourceId = link.get('source')?.id;
                        const targetId = link.get('target')?.id;

                        if (!sourceId || !targetId) return;

                        const sourceType = link.attr('custom/sourceType') || 'Zero or One';
                        const targetType = link.attr('custom/targetType') || 'Zero or One';

                        // Set visual marker
                        link.attr('line/sourceMarker/markup', crowMarkers[sourceType]);
                        link.attr('line/targetMarker/markup', crowMarkers[targetType]);

                        // Save to local state
                        newLinkTypes[link.id] = {
                            source: sourceType,
                            target: targetType
                        };
                    });

                    setLinkTypes(newLinkTypes);
                }
            } catch (error) {
                console.error("Import failed:", error);
            }
        };

        reader.readAsText(file);
    };

    const triggerFileDialog = () => {
        fileInputRef.current?.click();
    };

    return (
        <Stack direction="row" sx={{width: 1, height: 1}}>
            <input
                type="file"
                accept="application/json"
                ref={fileInputRef}
                onChange={handleImport}
                style={{display: "none"}}
            />
            <Box sx={{width: 'calc(100% - 300px)', height: '100%'}}>
                <Box sx={{position: 'fixed', zIndex: 2}}>
                    <Button variant="contained" onClick={() => transformWrapperRef.current?.zoomIn()}>+</Button>
                    <Button variant="contained" onClick={() => transformWrapperRef.current?.zoomOut()}>-</Button>
                    <Button variant="contained" onClick={() => transformWrapperRef.current?.resetTransform()}>x</Button>
                    <Button variant="contained" onClick={() => transformWrapperRef.current?.centerView()}>o</Button>
                    <Button onClick={addEntity} variant="contained">Add Entity</Button>
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
                <Box sx={{position: 'fixed', bottom: 16, right: 16, zIndex: 2}}>
                    <SpeedDial
                        ariaLabel="Import/Export Diagram"
                        icon={<SaveIcon/>}
                    >
                        <SpeedDialAction
                            icon={<SaveIcon/>}
                            tooltipTitle="Export"
                            onClick={handleExport}
                        />
                        <SpeedDialAction
                            icon={<FileUploadIcon/>}
                            tooltipTitle="Import"
                            onClick={triggerFileDialog}
                        />
                    </SpeedDial>
                </Box>
            </Box>
            <Paper elevation={3} sx={{height: '100%', width: '300px'}}>
                <Box sx={{padding: 2}}>
                    <Typography variant="h4" sx={{textAlign: 'center', mb: 2}}>Entity</Typography>
                    {selectedEntity ? (
                        <>
                            <Typography variant="h6">Settings:</Typography>
                            <TextField label="Name" fullWidth value={entityName}
                                       onChange={(e) => setEntityName(e.target.value)} sx={{mt: 2}}/>
                            <Typography variant="h6" sx={{mt: 3}}>Attributes:</Typography>
                            <List>
                                {attributes.map((attr, index) => (
                                    <ListItem key={index} sx={{display: 'flex', alignItems: 'center'}}>
                                        <TextField
                                            fullWidth
                                            value={attr}
                                            onChange={(e) => {
                                                const newAttributes = [...attributes];
                                                newAttributes[index] = e.target.value;
                                                setAttributes(newAttributes);
                                            }}
                                        />
                                        <IconButton
                                            onClick={() => setAttributes(attributes.filter((_, i) => i !== index))}>
                                            <CloseIcon/>
                                        </IconButton>
                                    </ListItem>
                                ))}
                            </List>

                            <Typography variant="h6" sx={{mt: 3}}>Connections:</Typography>
                            <List>
                                {connectedEntities.length === 0 ? null : connectedEntities.map((entity, index) => {
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
                                        <ListItem key={index} sx={{display: 'flex', alignItems: 'center'}}>
                                            <Box sx={{mr: 1}}>
                                                <Select
                                                    value={currentType}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        const links = graph?.getConnectedLinks(selectedEntity!);

                                                        const linkToUpdate = links.find(link => {
                                                            const sourceId = link.get('source')?.id;
                                                            const targetId = link.get('target')?.id;
                                                            return (
                                                                (sourceId === selectedEntity!.id && targetId === entity.id) ||
                                                                (sourceId === entity.id && targetId === selectedEntity!.id)
                                                            );
                                                        });

                                                        if (linkToUpdate) {
                                                            const isSource = linkToUpdate.get('source')?.id === selectedEntity!.id;
                                                            const side: LinkEnd = isSource ? 'source' : 'target';

                                                            linkToUpdate.attr(`line/${side}Marker/markup`, crowMarkers[value]);
                                                            linkToUpdate.attr(`custom/${side}Type`, value);

                                                            setLinkTypes(prev => ({
                                                                ...prev,
                                                                [linkToUpdate.id]: {
                                                                    ...prev[linkToUpdate.id],
                                                                    [side]: value
                                                                }
                                                            }));
                                                        }
                                                    }}
                                                    size="small"
                                                    sx={{minWidth: 140}}
                                                >
                                                    {Object.keys(crowMarkers).map((opt, idx) => (
                                                        <MenuItem key={idx} value={opt}>{opt}</MenuItem>
                                                    ))}
                                                </Select>
                                            </Box>
                                            <Typography sx={{flexGrow: 1}}>
                                                {entity.attr('headerText/text') || 'Unnamed Entity'}
                                            </Typography>
                                            <IconButton onClick={() => {
                                                const links = graph.getConnectedLinks(selectedEntity!);
                                                const linkToRemove = links.find(link => {
                                                    const sourceId = link.get('source')?.id;
                                                    const targetId = link.get('target')?.id;
                                                    return (
                                                        (sourceId === selectedEntity!.id && targetId === entity.id) ||
                                                        (sourceId === entity.id && targetId === selectedEntity!.id)
                                                    );
                                                });
                                                if (linkToRemove) {
                                                    linkToRemove.remove();
                                                    setConnectedEntities(prev => prev.filter(e => e.id !== entity.id));
                                                }
                                            }}>
                                                <CloseIcon/>
                                            </IconButton>
                                        </ListItem>
                                    );
                                })}
                            </List>
                            <Button variant="contained" fullWidth
                                    onClick={() => setAttributes([...attributes, "New Attribute"])} sx={{mt: 2}}>+ Add
                                Attribute</Button>
                            <Button onClick={handleSave} variant="contained" fullWidth sx={{mt: 3}}>Save</Button>
                        </>
                    ) : (
                        <Typography variant="h6" sx={{textAlign: 'center', mt: 3}}>Select an entity</Typography>
                    )}
                </Box>
            </Paper>
        </Stack>
    );
}