'use client'
import { DataManager, Query } from '@syncfusion/ej2-data';
import { StackPanel, TextElement, DataBinding, HierarchicalTree, DiagramComponent, Inject } from "@syncfusion/ej2-react-diagrams";
import { data } from '../datasource';
import { registerLicense } from '@syncfusion/ej2-base';

// Registering Syncfusion license key
registerLicense(process.env.NEXT_PUBLIC_LICENSE_KEY as string);

export default function Home() {
  let items: DataManager = new DataManager(data as JSON[], new Query().take(7));

  return (
    <>
      <h2>Syncfusion® React Diagram Component</h2>
      <DiagramComponent id="container" height={'450px'} layout={{
        type: 'HierarchicalTree',
        margin: {
          top: 20,
        },

      }} dataSourceSettings={{
        id: 'Id',
        parentId: 'ReportingPerson',
        dataManager: items,
      }} getNodeDefaults={(node: any) => {
        node.height = 50;
        node.style.fill = '#6BA5D7';
        node.borderColor = 'white';
        node.style.strokeColor = 'white';
        return node;
      }} getConnectorDefaults={(obj: any) => {
        obj.style.strokeColor = '#6BA5D7';
        obj.style.fill = '#6BA5D7';
        obj.style.strokeWidth = 2;
        obj.targetDecorator.style.fill = '#6BA5D7';
        obj.targetDecorator.style.strokeColor = '#6BA5D7';
        obj.targetDecorator.shape = 'None';
        obj.type = 'Orthogonal';
        return obj;
      }} setNodeTemplate={(obj: any) => {
        let content = new StackPanel();
        content.id = obj.id + '_outerstack';
        content.style.strokeColor = 'darkgreen';
        content.style.fill = '#6BA5D7';
        content.orientation = 'Horizontal';
        content.padding = {
          left: 5,
          right: 10,
          top: 5,
          bottom: 5,
        };
        let innerStack = new StackPanel();
        innerStack.style.strokeColor = 'none';
        innerStack.style.fill = '#6BA5D7';
        innerStack.margin = {
          left: 5,
          right: 0,
          top: 0,
          bottom: 0,
        };
        innerStack.id = obj.id + '_innerstack';
        let text = new TextElement();
        text.content = obj.data['Name'];
        text.style.color = 'white';
        text.style.strokeColor = 'none';
        text.style.fill = 'none';
        text.id = obj.id + '_text1';
        let desigText = new TextElement();
        desigText.margin = {
          left: 0,
          right: 0,
          top: 5,
          bottom: 0,
        };
        desigText.content = obj.data['Designation'];
        desigText.style.color = 'white';
        desigText.style.strokeColor = 'none';
        desigText.style.fill = 'none';
        desigText.style.textWrapping = 'Wrap';
        desigText.id = obj.id + '_desig';
        innerStack.children = [text, desigText];
        content.children = [innerStack];
        return content;
      }} >
        <Inject services={[DataBinding, HierarchicalTree]} />
      </DiagramComponent>
    </>
  )
}
