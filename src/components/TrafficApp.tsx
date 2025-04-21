"use client";

import {
	IconClock,
	IconMapPin,
	IconTrain,
} from "@tabler/icons-react";
import type React from "react";
import { useEffect, useState } from "react";
import { z } from "zod";
import ikisakiJson from "../assets/ikisaki.json";
import lineJson from "../assets/line.json";
import otherChgJson from "../assets/other_chg.json";
import positionJson from "../assets/position.json";
import railroadChgJson from "../assets/railload_chg.json";
import syasyuJson from "../assets/syasyu.json";
import trafficJson from "../assets/traffic_info.json";

// --- Zod Schemas for Static Configs ---
const SyasyuSchema = z.object({
	code: z.string(),
	style: z.string(),
	iconname: z.string(),
	name: z.string(),
	name_e: z.string(),
});
const LineSchema = z.object({
	code: z.string(),
	name: z.string(),
	kubun: z.string(),
	style: z.string(),
});
const PositionSchema = z.object({
	ID: z.string(),
	name: z.string(),
	kind: z.string(),
	max_disp: z.string().optional(),
});
const IkisakiSchema = z.object({
	code: z.string(),
	name: z.string(),
});
const OtherChgSchema = z.object({
	code: z.string(),
	line: z.string(),
	mark: z.string(),
	app: z.array(
		z.object({
			app_type: z.string(),
			app_name: z.string(),
			app_link: z.string(),
		}),
	),
	other: z.array(z.object({ linkname: z.string(), link: z.string() })),
});
const RailroadChgSchema = z.object({ name: z.string(), link: z.string() });

// Traffic JSON (dynamic)
const TrafficPointSchema = z.object({
	tr: z.string(),
	sy: z.string(),
	sy_tr: z.string(),
	ki: z.string(),
	bs: z.string(),
	dl: z.string(),
	ik: z.string(),
	ik_tr: z.string(),
	sr: z.string(),
	inf: z.string(),
});
const TSSchema = z.object({
	id: z.string(),
	sn: z.string(),
	ps: z.array(TrafficPointSchema),
});
const TBSchema = TSSchema;
const UpSchema = z.object({
	dt: z.array(
		z.object({
			yy: z.string(),
			mt: z.string(),
			dy: z.string(),
			hh: z.string(),
			mm: z.string(),
			ss: z.string(),
		}),
	),
	st: z.string(),
});
const TrafficSchema = z.object({
	up: z.array(UpSchema),
	TS: z.array(TSSchema),
	TB: z.array(TBSchema),
});

// Parse Static Configs
const config = {
	syasyu: z.array(SyasyuSchema).parse(syasyuJson.syasyu),
	lines: z.array(LineSchema).parse(lineJson.line),
	positions: z.array(PositionSchema).parse(positionJson.pos),
	destinations: z.array(IkisakiSchema).parse(ikisakiJson.ikisaki),
	otherChg: z.array(OtherChgSchema).parse(otherChgJson.chg),
	railroadChg: z.array(RailroadChgSchema).parse(railroadChgJson.chg),
};

// Hook to load dynamic trafic info
const useTraffic = () => {
	const [data, setData] = useState(() => TrafficSchema.parse(trafficJson));
	useEffect(() => {
		const iv = setInterval(() => {
			// For debug, using static import; replace fetch in prod
			setData(TrafficSchema.parse(trafficJson));
		}, 1000);
		return () => clearInterval(iv);
	}, []);
	return data;
};

// Line diagram component
const LineDiagram: React.FC = () => {
	const stations = config.positions
		.filter((p) => p.kind === "駅" && p.ID.startsWith("E"))
		.sort((a, b) => a.ID.localeCompare(b.ID));
	return (
		<div className="flex items-center space-x-4 overflow-x-auto p-4 bg-gray-50 rounded-lg">
			{stations.map((st) => (
				<div key={st.ID} className="flex-shrink-0 text-center">
					<IconMapPin className="mx-auto text-blue-600" />
					<div className="text-xs text-gray-700 mt-1">{st.name}</div>
				</div>
			))}
		</div>
	);
};

// Train card
type Point = z.infer<typeof TrafficPointSchema> & { stationId: string };
const TrainCard: React.FC<{ point: Point }> = ({ point }) => {
	const service = config.syasyu.find((s) => s.code === point.sy_tr) ?? {
		iconname: "",
		style: "",
		name: "",
	};
	const dest = config.destinations.find((d) => d.code === point.ik_tr) ?? {
		name: "不明",
	};
	const station = config.positions.find((p) => p.ID === point.stationId);
	return (
		<div className="bg-white rounded-2xl shadow p-4 flex flex-col space-y-2">
			<div className="flex items-center space-x-2">
				<IconTrain className="text-green-500" />
				<span className="font-bold text-lg">{point.tr.trim()}</span>
			</div>
			<div className="text-gray-600 text-sm">種別: {service.name}</div>
			<div className="text-gray-600 text-sm">行先: {dest.name}</div>
			<div className="text-gray-600 text-sm">
				現在地: {station?.name ?? "−"}
			</div>
			<div className="flex items-center space-x-2 text-gray-600 text-sm">
				<IconClock />
				<span>遅延: {point.dl === "00" ? "定時" : `${point.dl}分`}</span>
			</div>
		</div>
	);
};

// Main App component
export const TrafficApp: React.FC = () => {
	const { TS } = useTraffic();
	// Flatten points with stationId
	const points: Point[] = TS.flatMap((st) =>
		st.ps.map((p) => ({ ...p, stationId: st.id })),
	);
	return (
		<div className="space-y-8 p-6">
			<LineDiagram />
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
				{points.map((pt, i) => (
					<TrainCard key={`${pt.stationId}-${i}`} point={pt} />
				))}
			</div>
		</div>
	);
};
