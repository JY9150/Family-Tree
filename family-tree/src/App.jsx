import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import "./App.css";
import json_data from "./assets/family_member.json";
import PropTypes from "prop-types";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

Canvas.propTypes = {
  data: PropTypes.array.isRequired,
};

TreeChart.propTypes = {
  data: PropTypes.array.isRequired,
  svgRef: PropTypes.object.isRequired,
};

MyPersonCard.propTypes = {
  person: PropTypes.object.isRequired,
  simulation: PropTypes.object.isRequired,
};

MyLink.propTypes = {
  link: PropTypes.object.isRequired,
};

function MyPersonCard({ person, simulation }) {
  const selfRef = useRef();
  const cardWidth = 200;
  const cardHeight = 100;

  const genderColorScale = d3
    .scaleOrdinal()
    .domain(["male", "female", "non-binary", "unknown"])
    .range(["blue", "red", "grey", "black"]);

  useEffect(() => {
    if (!selfRef.current) {
      return;
    }

    const card = d3.select(selfRef.current);

    card.attr("transform", `translate(${-cardWidth / 2}, ${0})`);

    const drag = d3
      .drag()
      .on("start", (event) => {
        console.log("start");
        console.log("event", event);
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on("drag", (event) => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on("end", (event) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = null;
        event.subject.fy = null;
      });
    card.call(drag);
  }, [simulation]);

  return (
    <g ref={selfRef}>
      <foreignObject
        key={person.id}
        id={"card-" + person.id}
        className="node"
        width={200}
        height={100}
      >
        <Card sx={{ minWidth: 100, minHeight: 50 }}>
          <CardContent>
            <Typography variant="h7">{person.name}</Typography>
          </CardContent>
        </Card>
      </foreignObject>
    </g>
  );
}

function MyLink({ link }) {
  const selfRef = useRef();

  useEffect(() => {
    if (!selfRef.current) {
      return;
    }
  }, []);

  return (
    <line
      ref={selfRef}
      id={`link-${link.source.id}-${link.target.id}`}
      className="line"
      stroke={link.target.name === "fake" ? "yellow" : "black"}
      x1={link.source.x}
      y1={link.source.y}
      x2={link.target.x}
      y2={link.target.y}
      strokeWidth={4}
    />
  );
}

function TreeChart({ data, svgRef }) {
  const selfRef = useRef();
  const validData = paraseData(data);
  checkDataValid(validData);

  const linkLength = 200;

  const links = createLinks(validData);
  const nodes = createNodesFromLink(links, data);
  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance((link) => {
          if (link.target.name === "fake") {
            return linkLength / 2;
          } else {
            return linkLength;
          }
        })
    )
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(0, 0))
    .on("tick", () => {
      links.forEach((d) => {
        d3.select(`#link-${d.source.id}-${d.target.id}`)
          .attr("x1", d.source.x)
          .attr("y1", d.source.y)
          .attr("x2", d.target.x)
          .attr("y2", d.target.y);
      });

      nodes.forEach((d) => {
        if (d.name === "fake") {
          // !! All Fake node are in the Target
          const left_node = links.find(
            (link) => link.target.id === d.id
          ).source;
          const right_node = links.find(
            (link) => link.target.id === d.id && link.source.id !== left_node.id
          ).source;

          const new_cx = (left_node.x + right_node.x) / 2;
          const new_cy = (left_node.y + right_node.y) / 2;

          d.x = new_cx;
          d.y = new_cy;
        }
      });

      nodes.forEach((d) => {
        d3.select(`#card-${d.id}`).attr("x", d.x).attr("y", d.y);
      });
    });

  useEffect(() => {
    if (!svgRef.current || !selfRef.current) {
      return;
    }

    const svg = d3.select(svgRef.current);
    const svg_width =
      svg.node().clientWidth || svg.node().getBoundingClientRect().width;
    const svg_height =
      svg.node().clientHeight || svg.node().getBoundingClientRect().height;
    const treeChart = d3.select(selfRef.current);

    const links = d3.select(selfRef.current).selectAll(".link");
    const nodes = d3.select(selfRef.current).selectAll(".node");

    console.log("links", links);
    console.log("nodes", nodes);

    // simulation.force("center", d3.forceCenter(0, 0));
  }, [selfRef, links, nodes, svgRef, simulation]);

  return (
    <g className="treeChart" id="treeChart">
      <g>
        {links.map((link) => {
          return (
            <MyLink key={link.source.id + "-" + link.target.id} link={link} />
          );
        })}
      </g>
      <g>
        {nodes.map((node) =>
          node.name === "fake" ? null : (
            <MyPersonCard key={node.id} person={node} simulation={simulation} />
          )
        )}
      </g>
      <g>
        <text fontSize={50}>+</text>
      </g>
    </g>
  );
}

function App() {
  return (
    <>
      <Canvas data={json_data} />
    </>
  );
}

function Canvas({ data }) {
  const svgRef = useRef();
  const gRef = useRef();

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const svgItems = d3.select(gRef.current);

    const drag = d3
      .drag()
      .on("start", (event) => {
        console.log("start");
        const { x, y } = d3.zoomTransform(svgItems.node());
        event.subject = { startX: event.x - x, startY: event.y - y };
      })
      .on("drag", (event) => {
        const x = event.x - event.subject.startX;
        const y = event.y - event.subject.startY;
        svg.attr(
          "transform",
          `translate(${x}, ${y}) scale(${d3.zoomTransform(svgItems.node()).k})`
        );
      });

    const zoom = d3.zoom().on("zoom", (event) => {
      svgItems.attr("transform", event.transform);
    });

    svg.call(zoom);
    svg.call(drag);
  }, []);

  return (
    <svg ref={svgRef} className="canvas" id="canvas">
      <g ref={gRef}>
        <TreeChart data={data} svgRef={svgRef} />
      </g>
    </svg>
  );
}

function createLinks(data) {
  const links = [];
  let fakeNode_temp_id = 0;

  data.forEach((person) => {
    if (person.spouse.length > 0) {
      // Exist spouse
      const fakeNode_id = (--fakeNode_temp_id).toString();
      person.spouse.forEach((spouse_id) => {
        links.push({
          source: person.id,
          target: fakeNode_id,
          type: "marriage",
        });
        links.push({
          source: spouse_id,
          target: fakeNode_id,
          type: "marriage",
        });
      });

      if (person.children.length > 0) {
        person.children.forEach((child_id) => {
          links.push({
            source: fakeNode_id,
            target: child_id,
            type: "direct-relative",
          });
        });
      }
    }
  });
  return links;
}

function createNodesFromLink(links, data) {
  const nodes = [];
  const nodes_ids = new Set();

  links.forEach((link) => {
    nodes_ids.add(link.source);
    nodes_ids.add(link.target);
  });

  nodes_ids.forEach((id) => {
    if (id[0] === "-") {
      nodes.push({
        id: id,
        name: "fake",
      });
      return;
    } else {
      const person = data.find((person) => person.id === id);
      nodes.push({
        id: person.id,
        name: person.name,
        nickname: person.nickname,
        gender: person.gender,
        status: person.status,
      });
    }
  });
  return nodes;
}

function paraseData(data) {
  return data.map((person) => {
    return {
      id: person.id ?? "",
      name: person.name ?? "",
      nickname: person.nickname ?? "",
      status: person.status ?? "unknown",
      gender: person.gender ?? "unknown",
      spouse: person.spouse ?? [],
      children: person.children ?? [],
      image: person.image ?? "",
      birth: person.birth ?? "",
      death: person.death ?? "",
      location: person.location ?? "",
      title: person.title ?? "",
    };
  });
}

function checkDataValid(data) {
  // check if all ids are unique
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].id === data[i + 1].id) {
      console.error("Duplicate id: ", data[i].id);
      return null;
    }
  }

  // check if all spouse ids are valid
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].spouse.length; j++) {
      if (!data.find((person) => person.id === data[i].spouse[j])) {
        console.error("Invalid spouse id: ", data[i].spouse[j]);
        return null;
      }
    }
  }
  // check if all children ids are valid
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].children.length; j++) {
      if (!data.find((person) => person.id === data[i].children[j])) {
        console.error("Invalid children id: ", data[i].children[j]);
        return null;
      }
    }
  }
}

export default App;
