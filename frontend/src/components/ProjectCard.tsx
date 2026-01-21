import React from 'react';
import { FileText } from 'lucide-react';

type ProjectCardProps = {
    title: string;
    date: string;
    thumbnail?: string;
    onClick?: () => void;
};

const ProjectCard: React.FC<ProjectCardProps> = ({ title, date, thumbnail, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden aspect-[3/4] flex flex-col"
        >
            {/* Thumbnail Area */}
            <div className="flex-1 bg-gray-100 flex items-center justify-center relative overflow-hidden">
                {thumbnail && thumbnail !== '/placeholder-pdf.png' ? (
                    <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                        <FileText size={48} strokeWidth={1} />
                    </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Info Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                <h3 className="font-medium text-gray-900 truncate mb-1" title={title}>
                    {title}
                </h3>
                <p className="text-xs text-gray-500">{date}</p>
            </div>
        </div>
    );
};

export default ProjectCard;
