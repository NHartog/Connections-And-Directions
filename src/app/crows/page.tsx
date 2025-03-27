'use client'
import {
    Box,
    Button,
    Drawer,
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
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import CloseIcon from '@mui/icons-material/Close';

const crowOptions = [
    { value: 'zeroOrOne', label: 'Zero or One' },
    { value: 'oneOnly', label: 'One and Only One' },
    { value: 'zeroOrMany', label: 'Zero or Many' },
    { value: 'oneOrMany', label: 'One or Many' }
];

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
    const [linkTypes, setLinkTypes] = useState<{ [key: string]: string }>({});

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
                router:{name:"orthogonal"},
                connector: { name: 'normal' }
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

        setPaper(paper);
        setGraph(graph);
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

    return (
        <Stack direction="row" sx={{ width: 1, height: 1 }}>
            <Box sx={{ width: 'calc(100% - 300px)', height: '100%' }}>
                <Box sx={{ position: 'fixed', zIndex: 2 }}>
                    <Button variant="contained" onClick={() => transformWrapperRef.current?.zoomIn()}>+</Button>
                    <Button variant="contained" onClick={() => transformWrapperRef.current?.zoomOut()}>-</Button>
                    <Button variant="contained" onClick={() => transformWrapperRef.current?.resetTransform()}>x</Button>
                    <Button variant="contained" onClick={() => transformWrapperRef.current?.centerView()}>o</Button>
                    <Button onClick={addEntity} variant="contained">Add Entity</Button>
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
            </Box>
            <Paper elevation={3} sx={{ height: '100%', width: '300px'}}>
                <Box sx = {{padding: 2}}>
                    <Typography variant="h4" sx={{ textAlign: 'center', mb: 2 }}>Entity</Typography>
                    {selectedEntity ? (
                        <>
                            <Typography variant="h6">Settings:</Typography>
                            <TextField label="Name" fullWidth value={entityName} onChange={(e) => setEntityName(e.target.value)} sx={{ mt: 2 }} />
                            <Typography variant="h6" sx={{ mt: 3 }}>Attributes:</Typography>
                            <List>
                                {attributes.map((attr, index) => (
                                    <ListItem key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                                        <TextField
                                            fullWidth
                                            value={attr}
                                            onChange={(e) => {
                                                const newAttributes = [...attributes];
                                                newAttributes[index] = e.target.value;
                                                setAttributes(newAttributes);
                                            }}
                                        />
                                        <IconButton onClick={() => setAttributes(attributes.filter((_, i) => i !== index))}>
                                            <CloseIcon />
                                        </IconButton>
                                    </ListItem>
                                ))}
                            </List>

                            <Typography variant="h6" sx={{ mt: 3 }}>Connections:</Typography>
                            <List>
                                {connectedEntities.map((entity, index) => {
                                    const key = [selectedEntity.id, entity.id].sort().join('-');
                                    return (
                                        <ListItem key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Typography sx={{ flexGrow: 1 }}>
                                                {entity.attr('headerText/text') || 'Unnamed Entity'}
                                            </Typography>
                                            <Select
                                                size="small"
                                                value={linkTypes[key] || 'zeroOrOne'}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setLinkTypes(prev => ({ ...prev, [key]: value }));
                                                    // You can update the link's visual style here
                                                }}
                                            >
                                                {crowOptions.map((opt) => (
                                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                                ))}
                                            </Select>
                                            <IconButton
                                                onClick={() => {
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
                                                }}
                                            >
                                                <CloseIcon />
                                            </IconButton>
                                        </ListItem>
                                    );
                                })}
                            </List>
                            <Button variant="contained" fullWidth onClick={() => setAttributes([...attributes, "New Attribute"])} sx={{ mt: 2 }}>+ Add Attribute</Button>
                            <Button onClick={handleSave} variant="contained" fullWidth sx={{ mt: 3 }}>Save</Button>
                        </>
                    ) : (
                        <Typography variant="h6" sx={{ textAlign: 'center', mt: 3 }}>Select an entity</Typography>
                    )}
                </Box>
            </Paper>
        </Stack>
    );
}