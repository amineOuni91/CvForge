using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CvForge.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddJobOffers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "JobOfferId",
                table: "Cvs",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "JobOffers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Document = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobOffers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobOffers_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Cvs_JobOfferId",
                table: "Cvs",
                column: "JobOfferId");

            migrationBuilder.CreateIndex(
                name: "IX_JobOffers_UserId_UpdatedAt",
                table: "JobOffers",
                columns: new[] { "UserId", "UpdatedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_Cvs_JobOffers_JobOfferId",
                table: "Cvs",
                column: "JobOfferId",
                principalTable: "JobOffers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cvs_JobOffers_JobOfferId",
                table: "Cvs");

            migrationBuilder.DropTable(
                name: "JobOffers");

            migrationBuilder.DropIndex(
                name: "IX_Cvs_JobOfferId",
                table: "Cvs");

            migrationBuilder.DropColumn(
                name: "JobOfferId",
                table: "Cvs");
        }
    }
}
