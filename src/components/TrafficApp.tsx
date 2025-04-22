"use client";

import {
	IconAlertCircle,
	IconArrowRight,
	IconChevronLeft,
	IconChevronRight,
	IconClock,
	IconExternalLink,
	IconMapPin,
	IconTrain,
	IconX,
} from "@tabler/icons-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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

// Line colors
const LINE_COLORS = {
	"1": "bg-red-500", // 京王線
	"2": "bg-blue-500", // 相模原線
	"3": "bg-amber-500", // 井の頭線
};

const LINE_BG_COLORS = {
	"1": "bg-red-50", // 京王線
	"2": "bg-blue-50", // 相模原線
	"3": "bg-amber-50", // 井の頭線
};

const LINE_TEXT_COLORS = {
	"1": "text-red-600", // 京王線
	"2": "text-blue-600", // 相模原線
	"3": "text-amber-600", // 井の頭線
};

// Service type colors
const SERVICE_COLORS: { [key: string]: string } = {
	"1": "bg-red-600 text-white", // 特急
	"2": "bg-orange-500 text-white", // 急行
	"3": "bg-green-600 text-white", // 快速
	"5": "bg-teal-600 text-white", // 区間急行
	"6": "bg-blue-600 text-white", // 各駅停車
	"9": "bg-purple-600 text-white", // 京王ライナー
	"10": "bg-gray-600 text-white", // 臨時
	"11": "bg-emerald-600 text-white", // Mt.TAKAO
};

// Train direction mapping (0: 下り, 1: 上り)
const DIRECTION_MAP: { [key: string]: string } = {
	"0": "下り",
	"1": "上り",
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

// Get current date time formatted
const useFormattedDateTime = () => {
	const [dateTime, setDateTime] = useState("");

	useEffect(() => {
		const updateDateTime = () => {
			const now = new Date();
			const formatted = new Intl.DateTimeFormat("ja-JP", {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				hour12: false,
			}).format(now);
			setDateTime(formatted);
		};

		updateDateTime();
		const interval = setInterval(updateDateTime, 1000);
		return () => clearInterval(interval);
	}, []);

	return dateTime;
};

// Modal component
type ModalProps = {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-xs transition-opacity"
		onClick={onClose}>
			<div
				className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-auto"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="p-6 relative">
					<button
						className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
						onClick={onClose}
					>
						<IconX size={24} />
					</button>
					{children}
				</div>
			</div>
		</div>
	);
};

// Line diagram component
type Point = z.infer<typeof TrafficPointSchema> & { stationId: string };

const LineTimeline: React.FC<{
	lineCode: string;
	lineName: string;
	points: Point[];
	onTrainClick: (point: Point) => void;
}> = ({ lineCode, lineName, points, onTrainClick }) => {
	// Group stations by line
	const stations = useMemo(
		() =>
			config.positions
				.filter((p) => {
					if (lineCode === "1")
						return (
							p.kind === "駅" && p.ID.startsWith("E") && !p.ID.startsWith("E08")
						); // 京王線
					if (lineCode === "2")
						return (
							p.kind === "駅" &&
							(p.ID.startsWith("E04") || p.ID.startsWith("E05"))
						); // 相模原線
					if (lineCode === "3")
						return p.kind === "駅" && p.ID.startsWith("E08"); // 井の頭線
					return false;
				})
				.sort((a, b) => a.ID.localeCompare(b.ID)),
		[lineCode],
	);

	// パフォーマンス最適化
	const trainsByStation = useMemo(
		() =>
			points.reduce<Record<string, Point[]>>((acc, point) => {
				if (!acc[point.stationId]) {
					acc[point.stationId] = [];
				}
				acc[point.stationId].push(point);
				return acc;
			}, {}),
		[points],
	);

	// Get the reference to scroll horizontally
	const timelineRef = useRef<HTMLDivElement>(null);

	return (
		<div className="mb-8">
			<div className="flex items-center mb-2">
				<div
					className={`w-3 h-3 rounded-full ${LINE_COLORS[lineCode]} mr-2`}
				></div>
				<h2 className="text-lg font-bold">{lineName}</h2>
			</div>

			<div
				className={`rounded-xl ${LINE_BG_COLORS[lineCode]} p-4 border border-gray-200 shadow-sm`}
			>
				<div className="flex mb-4 overflow-x-auto gap-4 no-scrollbar">
					<button
						className="flex items-center justify-center p-2 bg-white rounded-full shadow-sm text-gray-500 hover:bg-gray-50"
						onClick={() => {
							if (timelineRef.current) {
								timelineRef.current.scrollLeft -= 300;
							}
						}}
					>
						<IconChevronLeft size={20} />
					</button>

					<button
						className="flex items-center justify-center p-2 bg-white rounded-full shadow-sm text-gray-500 hover:bg-gray-50"
						onClick={() => {
							if (timelineRef.current) {
								timelineRef.current.scrollLeft += 300;
							}
						}}
					>
						<IconChevronRight size={20} />
					</button>
				</div>

				<div ref={timelineRef} className="relative overflow-x-auto ">
					<div className="flex items-center min-w-max h-80 py-20">
						{/* Station timeline */}
						<div className="flex items-center">
							{stations.map((station, index) => (
								<div key={station.ID} className="flex flex-col items-center">
									{/* Station connection line */}
									{index > 0 && (
										<div className={`h-1 w-20 ${LINE_COLORS[lineCode]}`}></div>
									)}

									{/* Station marker */}
									<div className="relative group">

										{/* Station name */}
										<div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-medium">
											{station.name}
										</div>

										{/* Trains at this station */}
										{trainsByStation[station.ID]?.map((train, trainIndex) => {
											const service = config.syasyu.find(
												(s) => s.code === train.sy_tr,
											) || { name: "", iconname: "" };
											const isInbound = train.ki === "0"; // 上り

											return (
												<div
													key={`${train.tr}-${trainIndex}`}
													className={`absolute ${isInbound ? "-top-16" : "top-8"} left-1/2 transform -translate-x-1/2`}
													onClick={() => onTrainClick(train)}
												>
													<div
														className={`
                            flex items-center justify-center
                            w-16 h-7 rounded-full bg-white shadow-md border
                            cursor-pointer hover:bg-gray-50 transition-colors
                            relative
                          `}
													>
														<span className="text-xs font-bold">
															{train.tr.trim()}
														</span>

														{/* Direction indicator with animation */}
														<div
															className={`absolute ${isInbound ? "right-full" : "left-full"} top-1/2 transform -translate-y-1/2 flex items-center`}
														>
															<div
																className={`text-gray-900 animate-pulse flex ${isInbound ? "flex-row-reverse" : "flex-row"}`}
															>
																{isInbound ? (
																	<IconChevronLeft
																		size={16}
																		className="opacity-80"
																	/>
																) : (
																	<IconChevronRight
																		size={16}
																		className="opacity-80"
																	/>
																)}
															</div>
														</div>

														{/* Service type badge */}
														<div
															className={`absolute -top-3 -right-3 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${SERVICE_COLORS[train.sy_tr] || "bg-gray-500 text-white"}`}
														>
															{service.iconname}
														</div>

														{train.dl !== "00" && (
															<div className="absolute -top-3 -left-3 w-5 h-5 rounded-full flex items-center justify-center text-[20px] font-bold bg-black text-red-600">
																{train.dl}分
															</div>
														)}
													</div>
												</div>
											);
										})}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

// Train detail modal component
const TrainDetailModal: React.FC<{
	train: Point | null;
	isOpen: boolean;
	onClose: () => void;
}> = ({ train, isOpen, onClose }) => {
	if (!train) return null;

	const service = config.syasyu.find((s) => s.code === train.sy_tr) || {
		name: "",
		style: "",
		iconname: "",
	};
	const dest = config.destinations.find((d) => d.code === train.ik_tr) || {
		name: "不明",
	};
	const station = config.positions.find((p) => p.ID === train.stationId);
	const direction = DIRECTION_MAP[train.ki] || "不明";
	const line = config.lines.find((l) =>
		(l.kubun === station?.ID.charAt(0)) === "E" ? "KO" : "IN",
	) || { name: "不明" };

	// Find transfer information
	const stationCode = station?.ID.substring(1);
	const transfers = config.otherChg.filter((o) => o.code === stationCode);

	return (
		<Modal isOpen={isOpen} onClose={onClose}>
			<div>
				<div className="flex items-center space-x-3 mb-5">
					<div
						className={`w-10 h-10 rounded-lg flex items-center justify-center ${SERVICE_COLORS[train.sy_tr] || "bg-gray-600 text-white"}`}
					>
						<IconTrain size={24} />
					</div>
					<div>
						<h3 className="text-xl font-bold">{train.tr.trim()}</h3>
						<div className="text-sm text-gray-500">{line.name}</div>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4 mb-6">
					<div className="bg-gray-50 p-3 rounded-lg">
						<div className="text-xs text-gray-500 mb-1">種別</div>
						<div className="font-medium">{service.name}</div>
					</div>

					<div className="bg-gray-50 p-3 rounded-lg">
						<div className="text-xs text-gray-500 mb-1">方向</div>
						<div className="font-medium">{direction}</div>
					</div>

					<div className="bg-gray-50 p-3 rounded-lg">
						<div className="text-xs text-gray-500 mb-1">行先</div>
						<div className="font-medium">{dest.name}</div>
					</div>

					<div className="bg-gray-50 p-3 rounded-lg">
						<div className="text-xs text-gray-500 mb-1">現在位置</div>
						<div className="font-medium">{station?.name || "不明"}</div>
					</div>
				</div>

				<div className="flex items-center mb-4 bg-gray-50 p-3 rounded-lg">
					<IconClock size={18} className="text-gray-500 mr-2" />
					<div>
						<div className="text-xs text-gray-500">遅延状況</div>
						<div
							className={`font-medium ${train.dl !== "00" ? "text-red-600" : "text-green-600"}`}
						>
							{train.dl === "00" ? "定時運行中" : `${train.dl}分遅れ`}
						</div>
					</div>
				</div>

				{train.inf && (
					<div className="mb-5 bg-yellow-50 p-3 rounded-lg flex">
						<IconAlertCircle
							size={18}
							className="text-amber-500 mr-2 flex-shrink-0 mt-0.5"
						/>
						<div className="text-sm">{train.inf}</div>
					</div>
				)}

				{transfers.length > 0 && (
					<div className="mt-5">
						<h4 className="font-medium mb-2 text-gray-700">乗換案内</h4>
						<div className="space-y-2">
							{transfers.map((transfer, idx) => (
								<div key={idx} className="bg-gray-50 p-3 rounded-lg">
									{transfer.other.map((other, i) => (
										<div
											key={i}
											className="flex items-center justify-between text-sm py-1"
										>
											<span>{other.linkname}</span>
											<a
												href={other.link}
												target="_blank"
												rel="noopener noreferrer"
												className="text-blue-600 flex items-center hover:underline"
											>
												<IconExternalLink size={14} className="ml-1" />
											</a>
										</div>
									))}
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</Modal>
	);
};

// Stats component
const StatsBar: React.FC<{ trafficData: z.infer<typeof TrafficSchema> }> = ({
	trafficData,
}) => {
	const dateTime = useFormattedDateTime();
	const totalTrains = trafficData.TS.reduce(
		(acc, station) => acc + station.ps.length,
		0,
	);
	const delayedTrains = trafficData.TS.reduce((acc, station) => {
		return acc + station.ps.filter((train) => train.dl !== "00").length;
	}, 0);

	return (
		<div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
			<div className="flex flex-wrap justify-between items-center">
				<div className="flex items-center space-x-2">
					<div className="text-gray-500 text-sm">最終更新</div>
					<div className="font-medium">{dateTime}</div>
				</div>

				<div className="flex space-x-6">
					<div className="text-center">
						<div className="text-gray-500 text-sm">運行中</div>
						<div className="font-bold text-xl">{totalTrains}</div>
					</div>

					<div className="text-center">
						<div className="text-gray-500 text-sm">遅延</div>
						<div
							className={`font-bold text-xl ${delayedTrains > 0 ? "text-red-600" : "text-green-600"}`}
						>
							{delayedTrains}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

// Main App component
export const TrafficApp: React.FC = () => {
	const traffic = useTraffic();
	const [selectedTrain, setSelectedTrain] = useState<Point | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	// Group points by line
	const keioPoints: Point[] = traffic.TS.filter(
		(station) => station.id.startsWith("E") && !station.id.startsWith("E08"),
	).flatMap((st) => st.ps.map((p) => ({ ...p, stationId: st.id })));

	const sagamiharaPoints: Point[] = traffic.TS.filter(
		(station) => station.id.startsWith("E04") || station.id.startsWith("E05"),
	).flatMap((st) => st.ps.map((p) => ({ ...p, stationId: st.id })));

	const inokashiraPoints: Point[] = traffic.TS.filter((station) =>
		station.id.startsWith("E08"),
	).flatMap((st) => st.ps.map((p) => ({ ...p, stationId: st.id })));

	const handleTrainClick = (train: Point) => {
		setSelectedTrain(train);
		setIsModalOpen(true);
	};

	return (
		<div className="max-w-6xl mx-auto px-4 py-6 bg-gray-50 min-h-screen">
			<header className="mb-6">
				<h1 className="text-2xl font-bold text-gray-800 mb-1">
					京王線リアルタイム運行状況
				</h1>
				<p className="text-gray-500">
					列車位置情報をリアルタイムで確認できます
				</p>
			</header>

			<StatsBar trafficData={traffic} />

			<div className="space-y-6">
				<LineTimeline
					lineCode="1"
					lineName="京王線"
					points={keioPoints}
					onTrainClick={handleTrainClick}
				/>

				<LineTimeline
					lineCode="2"
					lineName="相模原線"
					points={sagamiharaPoints}
					onTrainClick={handleTrainClick}
				/>

				<LineTimeline
					lineCode="3"
					lineName="井の頭線"
					points={inokashiraPoints}
					onTrainClick={handleTrainClick}
				/>
			</div>

			<TrainDetailModal
				train={selectedTrain}
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>

			<footer className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
				<p>© 2025 京王電鉄運行情報 (Demo)</p>
				<div className="mt-2 flex justify-center space-x-4">
					{config.railroadChg.map((rr, i) => (
						<a
							key={i}
							href={rr.link}
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-gray-700 hover:underline"
						>
							{rr.name}
						</a>
					))}
				</div>
			</footer>
		</div>
	);
};
